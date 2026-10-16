import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, reconcile, type DbRow, type PaddleSub, type ReconcileDeps } from "./logic.ts";

const PT = { pri_p: "personal", pri_s: "solo", pri_t: "studio" } as const;
const U1 = "11111111-1111-4111-8111-111111111111", U2 = "22222222-2222-4222-8222-222222222222";
const NOW = Date.parse("2026-11-10T00:00:00Z");
const psub = (o: Partial<PaddleSub> = {}): PaddleSub => ({ id: "sub_AAAAAA", status: "active", items: [{ price: { id: "pri_s" } }], custom_data: { supabase_user_id: U1 }, scheduled_change: null, ...o });
const row = (o: Partial<DbRow> = {}): DbRow => ({ user_id: U1, plan: "solo", status: "active", paddle_subscription_id: "sub_AAAAAA", last_event_at: "2026-11-01T00:00:00Z", pending_plan: null, pending_plan_at: null, ...o });
const kinds = (p: PaddleSub[], r: DbRow[]) => compare(p, r, PT, NOW).map((f) => f.kind).sort();

test("tutarlı veri: bulgu yok", () => assert.deepEqual(kinds([psub()], [row()]), []));

test("Paddle canceled / DB past_due (0028 senaryosu): yüksek önem, onarılabilir", () => {
  const f = compare([psub({ status: "canceled" })], [row({ plan: "personal", status: "past_due" })], PT, NOW);
  assert.deepEqual(f.map((x) => [x.kind, x.severity, x.repairable]), [["paddle-canceled-db-live", "high", true]]);
});

test("plan ve durum uyuşmazlığı, Paddle'da olmayan kayıt, DB'siz canlı abonelik, farklı kullanıcı, çift canlı, bilinmeyen fiyat", () => {
  assert.deepEqual(kinds([psub({ items: [{ price: { id: "pri_t" } }] })], [row()]), ["plan-mismatch"]);
  assert.deepEqual(kinds([psub({ status: "past_due" })], [row()]), ["status-mismatch"]);
  assert.deepEqual(kinds([], [row()]), ["missing-in-paddle"]);
  assert.deepEqual(kinds([psub()], []), ["live-without-db"]);
  assert.deepEqual(kinds([psub({ custom_data: { supabase_user_id: U2 } })], [row()]), ["user-mismatch"]);
  assert.deepEqual(kinds([psub(), psub({ id: "sub_BBBBBB" })], [row()]), ["duplicate-live", "live-without-db"]);
  assert.deepEqual(kinds([psub({ items: [{ price: { id: "pri_x" } }] })], [row()]), ["unknown-price"]);
});

test("kimlikler maskelenir (tam abonelik/kullanıcı kimliği raporda yok)", () => {
  const f = compare([psub({ status: "canceled" })], [row()], PT, NOW)[0];
  assert.ok(!JSON.stringify(f).includes("sub_AAAAAA") && !JSON.stringify(f).includes(U1));
});

test("farklı kullanıcıya ait Paddle aboneliği onarılabilir DEĞİL", () => {
  const f = compare([psub({ status: "canceled", custom_data: { supabase_user_id: U2 } })], [row()], PT, NOW);
  assert.ok(f.find((x) => x.kind === "paddle-canceled-db-live")!.repairable === false);
});

test("bekleyen düşürme: vade yaklaşınca 'due', geçersiz/iptalli ise 'stale'", () => {
  const due = row({ pending_plan: "personal", pending_plan_at: "2026-11-10T12:00:00Z" });
  assert.deepEqual(kinds([psub()], [due]), ["pending-downgrade-due"]);
  assert.deepEqual(kinds([psub()], [row({ pending_plan: "personal", pending_plan_at: "2026-12-30T00:00:00Z" })]), []); // henüz erken
  assert.deepEqual(kinds([psub()], [row({ pending_plan: "studio", pending_plan_at: "2026-11-10T12:00:00Z" })]), ["pending-downgrade-stale"]); // yükseltme gibi
  assert.deepEqual(kinds([psub({ scheduled_change: { action: "cancel" } })], [due]), ["pending-downgrade-stale"]);
});

// ---- reconcile ----
function build(o: { paddle?: PaddleSub[]; rows?: DbRow[]; flags?: { repair: boolean; applyDowngrades: boolean }; readFails?: boolean; casCount?: number;
  changeFails?: boolean; verifyOk?: boolean; periodEnd?: string | null; auditFails?: boolean } = {}) {
  const calls: string[] = [];
  const deps: ReconcileDeps = {
    now: () => NOW, priceTier: { ...PT }, flags: o.flags ?? { repair: false, applyDowngrades: false },
    async listPaddle() { if (o.readFails) throw new Error("paddle 500"); return o.paddle ?? [psub({ status: "canceled" })]; },
    async listRows() { return o.rows ?? [row({ plan: "personal", status: "past_due" })]; },
    async repairCanceled() { calls.push("repair"); return o.casCount ?? 1; },
    priceIdFor: (p) => ({ personal: "pri_p", solo: "pri_s", studio: "pri_t" })[p],
    async getLive() { calls.push("getLive"); const verified = calls.filter((c) => c.startsWith("change")).length > 0 && (o.verifyOk ?? true);
      return { status: "active", scheduled_change: null, price_ids: [verified ? "pri_p" : "pri_s"], period_end: o.periodEnd === undefined ? "2026-11-10T12:00:00Z" : o.periodEnd }; },
    async changePlan(_s, pr, mode) { if (o.changeFails) throw new Error("paddle 422"); calls.push(`change:${pr}:${mode}`); },
    async clearPendingIf() { calls.push("clearPending"); return 1; },
    async audit(e) { if (o.auditFails) throw new Error("audit"); calls.push(`audit:${e.new_plan}/${e.new_status}`); },
    log: { error() {}, warn() {} },
  };
  return { deps, calls };
}

test("report modu SALT-OKUMA: hiçbir yazma/Paddle değişikliği yok", async () => {
  const b = build();
  const r = await reconcile(b.deps, { mode: "report" });
  assert.equal(r.ok, true); assert.equal(r.wrote, false);
  assert.equal(r.counts["paddle-canceled-db-live"], 1);
  assert.deepEqual(b.calls, []);
});

test("repair ve apply-downgrades varsayılan KAPALI: mode-disabled, yazma yok, sessiz başarı yok", async () => {
  for (const mode of ["repair", "apply-downgrades"] as const) {
    const b = build();
    const r = await reconcile(b.deps, { mode });
    assert.equal(r.ok, false); assert.equal(r.reason, "mode-disabled"); assert.equal(r.wrote, false);
    assert.deepEqual(b.calls, []);
  }
});

test("okuma hatası: ok:false (read-failed), eksik veriyle işlem yapılmaz", async () => {
  const r = await reconcile(build({ readFails: true, flags: { repair: true, applyDowngrades: true } }).deps, { mode: "repair" });
  assert.deepEqual([r.ok, r.reason], [false, "read-failed"]);
});

test("repair açıkken: CAS ile onarır ve denetim kaydı yazar; tekrar çalıştırma (CAS 0) no-op, denetim yok", async () => {
  const flags = { repair: true, applyDowngrades: false };
  const first = build({ flags });
  const r1 = await reconcile(first.deps, { mode: "repair" });
  assert.deepEqual([r1.ok, r1.wrote, r1.actions[0].result], [true, true, "done"]);
  assert.deepEqual(first.calls, ["repair", "audit:free/canceled"]);
  const again = build({ flags, casCount: 0 });
  const r2 = await reconcile(again.deps, { mode: "repair" });
  assert.deepEqual([r2.ok, r2.wrote, r2.actions[0].result], [true, false, "skipped-already-changed"]);
  assert.deepEqual(again.calls, ["repair"]);
});

test("repair: yalnızca canceled uyuşmazlığına dokunur (plan/durum farkı, farklı sahip, tutarlı satır onarılmaz)", async () => {
  const flags = { repair: true, applyDowngrades: false };
  for (const [p, rr] of [
    [[psub({ status: "past_due" })], [row()]],
    [[psub({ status: "canceled", custom_data: { supabase_user_id: U2 } })], [row()]],
    [[psub()], [row()]],
  ] as const) {
    const b = build({ flags, paddle: [...p], rows: [...rr] });
    await reconcile(b.deps, { mode: "repair" });
    assert.deepEqual(b.calls, []);
  }
});

test("repair: denetim kaydı yazılamazsa sessiz başarı yok (ok:false)", async () => {
  const r = await reconcile(build({ flags: { repair: true, applyDowngrades: false }, auditFails: true }).deps, { mode: "repair" });
  assert.equal(r.ok, false); assert.equal(r.actions[0].result, "failed");
});

const DUE = row({ pending_plan: "personal", pending_plan_at: "2026-11-10T12:00:00Z" });
test("apply-downgrades: vade yaklaşınca do_not_bill ile uygular, Paddle'da doğrular, denetler, bekleyeni temizler", async () => {
  const b = build({ flags: { repair: false, applyDowngrades: true }, paddle: [psub()], rows: [DUE] });
  const r = await reconcile(b.deps, { mode: "apply-downgrades" });
  assert.deepEqual([r.ok, r.wrote, r.actions[0].result, r.actions[0].note], [true, true, "done", "do_not_bill"]);
  assert.deepEqual(b.calls.filter((c) => !c.startsWith("getLive")), ["change:pri_p:do_not_bill", "audit:personal/active", "clearPending"]);
});

test("apply-downgrades: dönem geçmişse prorated_next_billing_period; Paddle reddederse/doğrulanamazsa ok:false ve bekleyen KORUNUR", async () => {
  const past = build({ flags: { repair: false, applyDowngrades: true }, paddle: [psub()], rows: [DUE], periodEnd: "2026-11-09T00:00:00Z" });
  assert.equal((await reconcile(past.deps, { mode: "apply-downgrades" })).actions[0].note, "prorated_next_billing_period");
  for (const o of [{ changeFails: true }, { verifyOk: false }]) {
    const b = build({ flags: { repair: false, applyDowngrades: true }, paddle: [psub()], rows: [DUE], ...o });
    const r = await reconcile(b.deps, { mode: "apply-downgrades" });
    assert.equal(r.ok, false);
    assert.ok(!b.calls.includes("clearPending") && !b.calls.some((c) => c.startsWith("audit")));
  }
});

test("apply-downgrades: vade erken / Paddle'da planlı değişiklik / plan uyuşmazlığı varsa dokunmaz", async () => {
  const flags = { repair: false, applyDowngrades: true };
  const early = build({ flags, paddle: [psub()], rows: [row({ pending_plan: "personal", pending_plan_at: "2026-12-30T00:00:00Z" })] });
  await reconcile(early.deps, { mode: "apply-downgrades" });
  assert.deepEqual(early.calls, []);
  const sched = build({ flags, paddle: [psub({ scheduled_change: { action: "cancel" } })], rows: [DUE] });
  await reconcile(sched.deps, { mode: "apply-downgrades" });
  assert.deepEqual(sched.calls, []);
  const mism = build({ flags, paddle: [psub({ items: [{ price: { id: "pri_t" } }] })], rows: [DUE] });
  await reconcile(mism.deps, { mode: "apply-downgrades" });
  assert.ok(!mism.calls.some((c) => c.startsWith("change")));
});
