import { test } from "node:test";
import assert from "node:assert/strict";
import { handleDelete, type DeleteDeps, type Outcome } from "./logic.ts";

function build(o: {
  row?: { paddle_subscription_id: string | null; paddle_customer_id: string | null; status?: string | null } | null | "throw";
  status?: Record<string, string | null | "throw">; // id -> durum; cancelNow sonrası "canceled" olur (afterCancel ile ezilebilir)
  customerLive?: string[]; cancelFails?: boolean; stillLiveAfterCancel?: boolean; deleteFails?: boolean; logFails?: boolean;
  env?: "sandbox" | "production" | null; key?: boolean;
} = {}) {
  const calls: string[] = []; const logs: { outcome: Outcome; subscription_canceled: boolean }[] = [];
  const status = { ...(o.status ?? {}) };
  const deps: DeleteDeps = {
    environment: o.env === undefined ? "sandbox" : o.env, hasApiKey: o.key ?? true,
    async getRow() { if (o.row === "throw") throw new Error("db"); return o.row === undefined ? { paddle_subscription_id: "sub_A", paddle_customer_id: "ctm_A" } : o.row; },
    paddle: {
      async getStatus(id) { const s = status[id]; if (s === "throw") throw new Error("paddle"); return s === undefined ? null : s; },
      async liveIdsOfCustomer() { return o.customerLive ?? []; },
      async cancelNow(id) { if (o.cancelFails) throw new Error("paddle 500"); calls.push(`cancel:${id}`); if (!o.stillLiveAfterCancel) status[id] = "canceled"; },
    },
    async deleteUser() { if (o.deleteFails) throw new Error("auth"); calls.push("deleteUser"); },
    async hash() { return "h"; },
    async writeLog(e) { if (o.logFails) throw new Error("log"); logs.push({ outcome: e.outcome, subscription_canceled: e.subscription_canceled }); },
    log: { error() {}, warn() {} },
  };
  return { deps, calls, logs };
}

test("abonelik satırı yok: doğrudan silinir, Paddle'a gidilmez", async () => {
  const b = build({ row: null });
  const r = await handleDelete(b.deps, "u");
  assert.deepEqual(r.body, { ok: true, subscriptionCanceled: false });
  assert.deepEqual(b.calls, ["deleteUser"]);
});

test("canlı abonelik: ÖNCE anında iptal (doğrulanır), SONRA silme; log 'deleted'", async () => {
  const b = build({ status: { sub_A: "active" } });
  const r = await handleDelete(b.deps, "u");
  assert.deepEqual(r.body, { ok: true, subscriptionCanceled: true });
  assert.deepEqual(b.calls, ["cancel:sub_A", "deleteUser"]);
  assert.deepEqual(b.logs, [{ outcome: "deleted", subscription_canceled: true }]);
});

test("Paddle iptali BAŞARISIZ: hesap silinmez, başarı yok", async () => {
  const b = build({ status: { sub_A: "active" }, cancelFails: true });
  const r = await handleDelete(b.deps, "u");
  assert.equal(r.body.ok, false);
  assert.equal(r.body.reason, "subscription-cancel-failed");
  assert.ok(!b.calls.includes("deleteUser"));
  assert.equal(b.logs[0].outcome, "cancel-failed");
});

test("iptal istendi ama Paddle hâlâ canlı gösteriyor (doğrulanamadı): silinmez", async () => {
  const b = build({ status: { sub_A: "past_due" }, stillLiveAfterCancel: true });
  const r = await handleDelete(b.deps, "u");
  assert.equal(r.body.reason, "subscription-cancel-failed");
  assert.ok(!b.calls.includes("deleteUser"));
});

test("Paddle okunamıyor / yapılandırma yok / DB okunamıyor: silinmez (unverifiable)", async () => {
  for (const o of [{ status: { sub_A: "throw" as const } }, { env: null }, { key: false }, { row: "throw" as const }]) {
    const b = build(o);
    const r = await handleDelete(b.deps, "u");
    assert.equal(r.body.reason, "unverifiable", JSON.stringify(o));
    assert.ok(!b.calls.includes("deleteUser"));
  }
});

test("Paddle'da zaten canceled / 404 (kayıt de canceled): iptal çağrısı yok, hesap silinir", async () => {
  for (const s of ["canceled", null]) {
    const b = build({ status: { sub_A: s }, row: { paddle_subscription_id: "sub_A", paddle_customer_id: "ctm_A", status: "canceled" } });
    assert.equal((await handleDelete(b.deps, "u")).body.ok, true);
    assert.deepEqual(b.calls, ["deleteUser"]);
  }
});

test("müşterinin DB'de olmayan başka canlı aboneliği de iptal edilir (çift abonelik kalıntısı)", async () => {
  const b = build({ status: { sub_A: "canceled", sub_B: "active" }, customerLive: ["sub_B"] });
  const r = await handleDelete(b.deps, "u");
  assert.equal(r.body.ok, true);
  assert.deepEqual(b.calls, ["cancel:sub_B", "deleteUser"]);
});

test("iptal başarılı ama kullanıcı silinemedi: ok:false, subscriptionCanceled:true, tekrar denenebilir", async () => {
  const b = build({ status: { sub_A: "active" }, deleteFails: true });
  const r = await handleDelete(b.deps, "u");
  assert.deepEqual(r.body, { ok: false, reason: "delete-failed", subscriptionCanceled: true });
  assert.equal(b.logs.at(-1)?.outcome, "delete-failed");
});

test("denetim logu yazılamasa da güvenlik akışı bozulmaz (silme yine doğru sırada)", async () => {
  const b = build({ status: { sub_A: "active" }, logFails: true });
  assert.equal((await handleDelete(b.deps, "u")).body.ok, true);
  assert.deepEqual(b.calls, ["cancel:sub_A", "deleteUser"]);
});

test("yanlış ortam koruması: Paddle kimliği 404 ama kayıt iptal değil/bilinmiyor -> hesap SİLİNMEZ (unverifiable)", async () => {
  for (const status of ["active", "past_due", "paused", undefined, null]) {
    const b = build({ status: { sub_A: null }, row: { paddle_subscription_id: "sub_A", paddle_customer_id: null, status } });
    const r = await handleDelete(b.deps, "u");
    assert.equal(r.body.ok, false, String(status));
    assert.equal(r.body.reason, "unverifiable");
    assert.deepEqual(b.calls, []);
    assert.equal(b.logs[0]?.outcome, "unverifiable");
  }
});
