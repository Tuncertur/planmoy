import { test } from "node:test";
import assert from "node:assert/strict";
import { handleManage, type ManageDeps, type LiveSub, type SubRow } from "./logic.ts";

const row = (o: Partial<SubRow> = {}): SubRow => ({ plan: "solo", status: "active", paddle_subscription_id: "sub_A", paddle_customer_id: "ctm_A", ...o });
function build(o: { row?: SubRow | null; lives?: (LiveSub | null)[]; fail?: string; env?: "sandbox" | "production" | null; key?: boolean } = {}) {
  const calls: string[] = [];
  const lives = o.lives ?? [{ status: "active", scheduled_change: null }];
  let i = 0;
  const deps: ManageDeps = {
    environment: o.env === undefined ? "sandbox" : o.env,
    hasApiKey: o.key ?? true,
    async getRow() { return o.row === undefined ? row() : o.row; },
    async clearPending() { calls.push("clearPending"); },
    paddle: {
      async getSubscription() { return lives[Math.min(i++, lives.length - 1)]; },
      async cancelAtPeriodEnd() { if (o.fail === "cancel") throw new Error("paddle 500"); calls.push("cancel"); },
      async removeScheduledChange() { if (o.fail === "resume") throw new Error("paddle 500"); calls.push("resume"); },
      async portalUrl() { if (o.fail === "portal") throw new Error("paddle 500"); calls.push("portal"); return "https://portal.example/x"; },
    },
    log: { error() {}, warn() {} },
  };
  return { deps, calls };
}
const CANCELLED: LiveSub = { status: "active", scheduled_change: { action: "cancel", effective_at: "2026-11-16T00:00:00Z" } };
const FREE: LiveSub = { status: "active", scheduled_change: null };

test("geçersiz eylem 400; anahtar/ortam yoksa not-configured (fail-closed)", async () => {
  assert.equal((await handleManage(build().deps, "u", "delete")).status, 400);
  assert.equal((await handleManage(build({ env: null }).deps, "u", "cancel")).body.reason, "not-configured");
  assert.equal((await handleManage(build({ key: false }).deps, "u", "portal")).body.reason, "not-configured");
});

test("abonelik yoksa / free / canceled -> no-subscription, Paddle'a dokunulmaz", async () => {
  for (const r of [null, row({ plan: "free" }), row({ status: "canceled" }), row({ paddle_subscription_id: null })]) {
    const b = build({ row: r });
    assert.equal((await handleManage(b.deps, "u", "cancel")).body.reason, "no-subscription");
    assert.equal(b.calls.length, 0);
  }
});

test("portal: bağlantı döner; müşteri yoksa no-customer; Paddle hatasında başarı YOK", async () => {
  assert.deepEqual((await handleManage(build().deps, "u", "portal")).body, { ok: true, url: "https://portal.example/x" });
  assert.equal((await handleManage(build({ row: row({ paddle_customer_id: null }) }).deps, "u", "portal")).body.reason, "no-customer");
  assert.equal((await handleManage(build({ fail: "portal" }).deps, "u", "portal")).body.reason, "provider-error");
});

test("iptal dönem sonunda planlanır, doğrulanır, bekleyen düşürme temizlenir", async () => {
  const b = build({ lives: [FREE, CANCELLED] });
  const r = await handleManage(b.deps, "u", "cancel");
  assert.deepEqual(r.body, { ok: true, scheduled: true, effectiveAt: "2026-11-16T00:00:00Z" });
  assert.deepEqual(b.calls, ["cancel", "clearPending"]);
});

test("iptal tekrarı idempotent (already), Paddle'a ikinci çağrı yok", async () => {
  const b = build({ lives: [CANCELLED] });
  const r = await handleManage(b.deps, "u", "cancel");
  assert.equal(r.body.already, true);
  assert.equal(b.calls.length, 0);
});

test("Paddle iptali başarısızsa başarı mesajı YOK; planlandığı doğrulanamazsa cancel-unverified", async () => {
  assert.equal((await handleManage(build({ fail: "cancel" }).deps, "u", "cancel")).body.reason, "provider-error");
  const b = build({ lives: [FREE, FREE] });
  const r = await handleManage(b.deps, "u", "cancel");
  assert.equal(r.body.ok, false);
  assert.equal(r.body.reason, "cancel-unverified");
  assert.ok(!b.calls.includes("clearPending"));
});

test("canlı abonelik Paddle'da zaten canceled -> already-canceled; başka planlı değişiklik varken iptal reddedilir", async () => {
  assert.equal((await handleManage(build({ lives: [{ status: "canceled", scheduled_change: null }] }).deps, "u", "cancel")).body.reason, "already-canceled");
  assert.equal((await handleManage(build({ lives: [{ status: "active", scheduled_change: { action: "pause" } }] }).deps, "u", "cancel")).body.reason, "scheduled-change-pending");
  assert.equal((await handleManage(build({ lives: [null] }).deps, "u", "cancel")).body.reason, "subscription-inconsistent");
});

test("resume: planlı iptali geri alır ve doğrular; iptal yoksa nothing-to-resume; doğrulanamazsa resume-unverified", async () => {
  const ok = build({ lives: [CANCELLED, FREE] });
  assert.deepEqual((await handleManage(ok.deps, "u", "resume")).body, { ok: true, resumed: true });
  assert.deepEqual(ok.calls, ["resume"]);
  assert.equal((await handleManage(build({ lives: [FREE] }).deps, "u", "resume")).body.reason, "nothing-to-resume");
  assert.equal((await handleManage(build({ lives: [CANCELLED, CANCELLED] }).deps, "u", "resume")).body.reason, "resume-unverified");
  assert.equal((await handleManage(build({ lives: [CANCELLED], fail: "resume" }).deps, "u", "resume")).body.reason, "provider-error");
});
