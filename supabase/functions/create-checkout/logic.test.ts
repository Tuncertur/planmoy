// Çalıştırma: npm run test:functions
import test from "node:test";
import assert from "node:assert/strict";
import {
  claimLock, decideCheckout, handleCheckout, LOCK_INFLIGHT_MS, LOCK_PENDING_MS,
  type CheckoutDeps, type ExistingSub, type Lock, type LockStore, type PaidTier,
} from "./logic.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const NOW = Date.UTC(2026, 9, 16, 9, 0, 0);
const PERIOD_END = "2026-11-16T08:00:00Z";
const PRICES: Record<PaidTier, string> = { personal: "pri_p", solo: "pri_s", studio: "pri_t" };
const sub = (o: Partial<ExistingSub> = {}): ExistingSub => ({ plan: "personal", status: "active", paddle_subscription_id: "sub_A", ...o });

// ---------------- plan kararı ----------------
test("decideCheckout: abonelik yok / free / canceled -> yeni checkout", () => {
  assert.deepEqual(decideCheckout(null, "solo"), { kind: "new" });
  assert.deepEqual(decideCheckout(sub({ plan: "free", status: "active", paddle_subscription_id: null }), "solo"), { kind: "new" });
  assert.deepEqual(decideCheckout(sub({ plan: "free", status: "canceled" }), "personal"), { kind: "new" });
  assert.deepEqual(decideCheckout(sub({ plan: "solo", status: "canceled" }), "studio"), { kind: "new" });
});

test("decideCheckout: aktif abonelik -> yeni abonelik AÇILMAZ; yükseltme/düşürme mevcut abonelikte", () => {
  assert.deepEqual(decideCheckout(sub(), "solo"), { kind: "change", direction: "upgrade", subscriptionId: "sub_A" });
  assert.deepEqual(decideCheckout(sub(), "studio"), { kind: "change", direction: "upgrade", subscriptionId: "sub_A" });
  assert.deepEqual(decideCheckout(sub({ plan: "studio" }), "personal"), { kind: "change", direction: "downgrade", subscriptionId: "sub_A" });
  assert.deepEqual(decideCheckout(sub({ plan: "solo" }), "solo"), { kind: "block", reason: "same-plan" });
  assert.deepEqual(decideCheckout(sub({ plan: "solo", pending_plan: "personal", pending_plan_at: "x" }), "solo"), { kind: "clear-pending" });
});

test("decideCheckout: past_due / paused / tutarsız kayıt engellenir", () => {
  assert.deepEqual(decideCheckout(sub({ status: "past_due" }), "solo"), { kind: "block", reason: "payment-issue" });
  assert.deepEqual(decideCheckout(sub({ status: "paused" }), "solo"), { kind: "block", reason: "paused" });
  assert.deepEqual(decideCheckout(sub({ paddle_subscription_id: null }), "solo"), { kind: "block", reason: "subscription-inconsistent" });
  assert.deepEqual(decideCheckout(sub({ plan: "bilinmeyen" }), "solo"), { kind: "block", reason: "subscription-inconsistent" });
});

// ---------------- kilit ----------------
function lockStore(initial?: Lock | null) {
  let row: Lock | null = initial ?? null;
  const calls: string[] = [];
  const store: LockStore = {
    async insert(_u, lock) { calls.push("insert"); if (row) return "exists"; row = { ...lock }; return "ok"; },
    async get() { return row ? { ...row } : null; },
    async replaceIf(_u, expected, lock) { calls.push("replaceIf"); if (!row || row.expires_at !== expected) return false; row = { ...lock }; return true; },
    async setTransaction(_u, id, exp) { calls.push("setTransaction"); row = { ...row!, transaction_id: id, expires_at: exp }; },
    async remove() { calls.push("remove"); row = null; },
  };
  return { store, calls, get row() { return row; } };
}
const iso = (ms: number) => new Date(ms).toISOString();

test("claimLock: boşsa alınır; eşzamanlı ikinci istek (işlem henüz yok) 'busy'", async () => {
  const l = lockStore();
  assert.deepEqual(await claimLock(l.store, USER, "solo", NOW, async () => null), { state: "claimed" });
  assert.deepEqual(await claimLock(l.store, USER, "solo", NOW + 1000, async () => null), { state: "busy" });
});

test("claimLock: bekleyen (draft/ready) aynı plan işlemi YENİDEN KULLANILIR", async () => {
  for (const s of ["draft", "ready"]) {
    const l = lockStore({ plan: "solo", transaction_id: "txn_1", expires_at: iso(NOW + 60_000) });
    assert.deepEqual(await claimLock(l.store, USER, "solo", NOW, async () => s), { state: "reuse", transactionId: "txn_1" });
  }
});

test("claimLock: işlem ödenmiş (billed/paid/completed) -> yeni işlem OLUŞTURULMAZ ('processing')", async () => {
  for (const s of ["billed", "paid", "completed"]) {
    const l = lockStore({ plan: "solo", transaction_id: "txn_1", expires_at: iso(NOW + 60_000) });
    assert.deepEqual(await claimLock(l.store, USER, "solo", NOW, async () => s), { state: "processing" });
    assert.equal(l.calls.includes("replaceIf"), false);
  }
});

test("claimLock: farklı plan, iptal edilmiş işlem veya süresi dolmuş kilit devralınır", async () => {
  const diff = lockStore({ plan: "personal", transaction_id: "txn_1", expires_at: iso(NOW + 60_000) });
  assert.deepEqual(await claimLock(diff.store, USER, "studio", NOW, async () => "ready"), { state: "claimed" });
  const canceled = lockStore({ plan: "solo", transaction_id: "txn_1", expires_at: iso(NOW + 60_000) });
  assert.deepEqual(await claimLock(canceled.store, USER, "solo", NOW, async () => "canceled"), { state: "claimed" });
  const expired = lockStore({ plan: "solo", transaction_id: null, expires_at: iso(NOW - 1) });
  assert.deepEqual(await claimLock(expired.store, USER, "solo", NOW, async () => null), { state: "claimed" });
});

test("claimLock: devralma yarışı kaybedilirse 'busy' (çift işlem yok)", async () => {
  const l = lockStore({ plan: "solo", transaction_id: null, expires_at: iso(NOW - 1) });
  const racing: LockStore = { ...l.store, replaceIf: async () => false };
  assert.deepEqual(await claimLock(racing, USER, "solo", NOW, async () => null), { state: "busy" });
});

// ---------------- istek işleme ----------------
function build(o: {
  existing?: ExistingSub | null; env?: "sandbox" | "production" | null; apiKey?: boolean; lock?: ReturnType<typeof lockStore>;
  txnStatus?: string | null; liveSub?: { status: string; scheduled_change: unknown; period_end?: string | null } | null; createFails?: boolean; changeFails?: boolean;
  pendingFails?: boolean; allowed?: boolean;
} = {}) {
  const lock = o.lock ?? lockStore();
  const calls: string[] = [];
  let n = 0;
  const deps: CheckoutDeps = {
    now: () => NOW,
    environment: o.env === undefined ? "sandbox" : o.env,
    hasApiKey: o.apiKey ?? true,
    priceFor: (p) => PRICES[p],
    getSubscription: async () => (o.existing === undefined ? null : o.existing),
    userAllowed: () => o.allowed ?? true,
    locks: lock.store,
    async setPending(_u, plan, at) { if (o.pendingFails) throw new Error("db down"); calls.push(`pending:${plan}:${at}`); },
    async clearPending() { calls.push("clearPending"); },
    paddle: {
      async createTransaction(priceId, userId, plan) {
        calls.push(`create:${priceId}:${plan}`); n++;
        if (o.createFails) throw new Error("paddle 500");
        assert.equal(userId, USER);
        return `txn_${n}`;
      },
      async getTransactionStatus() { return o.txnStatus === undefined ? "ready" : o.txnStatus; },
      async getSubscription() { return o.liveSub === undefined ? { status: "active", scheduled_change: null, period_end: PERIOD_END } : o.liveSub; },
      async changePlan(subId, priceId, mode) { calls.push(`change:${subId}:${priceId}:${mode}`); if (o.changeFails) throw new Error("paddle 400"); },
    },
    log: { error: () => {}, warn: () => {} },
  };
  return { deps, calls, lock };
}

test("geçersiz plan 400; yapılandırma eksikse fail-closed 'not-configured' (ortam belirsizse CANLIYA DÜŞMEZ)", async () => {
  assert.equal((await handleCheckout(build().deps, USER, "enterprise")).status, 400);
  assert.equal((await handleCheckout(build().deps, USER, undefined)).status, 400);
  for (const o of [{ env: null }, { apiKey: false }] as const) {
    const b = build(o);
    const r = await handleCheckout(b.deps, USER, "solo");
    assert.equal(r.body.reason, "not-configured");
    assert.equal(b.calls.length, 0);
  }
  const noPrice = build();
  noPrice.deps.priceFor = () => undefined;
  assert.equal((await handleCheckout(noPrice.deps, USER, "solo")).body.reason, "not-configured");
});

test("yeni kullanıcı: işlem oluşturulur (fiyat sunucudan), kilit işlem kimliğiyle 15 dk saklanır", async () => {
  const b = build();
  const r = await handleCheckout(b.deps, USER, "solo");
  assert.deepEqual(r.body, { ok: true, transactionId: "txn_1" });
  assert.deepEqual(b.calls, ["create:pri_s:solo"]);
  assert.equal(b.lock.row!.transaction_id, "txn_1");
  assert.equal(Date.parse(b.lock.row!.expires_at), NOW + LOCK_PENDING_MS);
  assert.ok(LOCK_INFLIGHT_MS < LOCK_PENDING_MS);
});

test("çift tıklama / eşzamanlı istek: ikinci istek yeni işlem açmaz (busy ya da aynı işlem)", async () => {
  const b = build();
  const first = await handleCheckout(b.deps, USER, "solo");
  const second = await handleCheckout(b.deps, USER, "solo");
  assert.equal(second.body.transactionId, first.body.transactionId);
  assert.equal(second.body.reused, true);
  assert.equal(b.calls.filter((c) => c.startsWith("create")).length, 1);

  // işlem henüz oluşturulurken (kilit var, işlem kimliği yok)
  const inflight = build({ lock: lockStore({ plan: "solo", transaction_id: null, expires_at: iso(NOW + 30_000) }) });
  assert.equal((await handleCheckout(inflight.deps, USER, "solo")).body.reason, "checkout-in-progress");
  assert.equal(inflight.calls.length, 0);
});

test("ödeme alınmış ama webhook henüz gelmemiş: yeni işlem açılmaz ('payment-processing')", async () => {
  const b = build({ lock: lockStore({ plan: "solo", transaction_id: "txn_1", expires_at: iso(NOW + 60_000) }), txnStatus: "completed" });
  const r = await handleCheckout(b.deps, USER, "solo");
  assert.equal(r.body.reason, "payment-processing");
  assert.equal(b.calls.length, 0);
});

test("Paddle işlem oluşturamazsa kilit bırakılır, 'provider-error', yeniden denenebilir", async () => {
  const b = build({ createFails: true });
  const r = await handleCheckout(b.deps, USER, "solo");
  assert.equal(r.body.reason, "provider-error");
  assert.equal(b.lock.row, null);
});

test("aktif aboneliği olana yeni checkout AÇILMAZ: yükseltme mevcut abonelikte, orantılı hemen tahsilatla", async () => {
  const b = build({ existing: sub() });
  const r = await handleCheckout(b.deps, USER, "studio");
  assert.deepEqual(r.body, { ok: true, changed: true, direction: "upgrade" });
  assert.deepEqual(b.calls, ["change:sub_A:pri_t:prorated_immediately"]);
  assert.equal(b.lock.row, null); // kilit/işlem hiç oluşmadı
});

test("düşürme DÖNEM SONUNDA uygulanır: Paddle'a dokunulmaz, bekleyen plan dönem sonu tarihiyle saklanır", async () => {
  const b = build({ existing: sub({ plan: "studio" }) });
  const r = await handleCheckout(b.deps, USER, "personal");
  assert.deepEqual(r.body, { ok: true, scheduled: true, direction: "downgrade", effectiveAt: PERIOD_END });
  assert.deepEqual(b.calls, [`pending:personal:${PERIOD_END}`]); // changePlan / create YOK
});

test("düşürme: dönem sonu Paddle'dan yoksa DB'deki current_period_end kullanılır; ikisi de yoksa reddedilir", async () => {
  const fromDb = build({ existing: sub({ plan: "studio", current_period_end: "2026-12-01T00:00:00Z" }), liveSub: { status: "active", scheduled_change: null, period_end: null } });
  assert.equal((await handleCheckout(fromDb.deps, USER, "solo")).body.effectiveAt, "2026-12-01T00:00:00Z");
  const none = build({ existing: sub({ plan: "studio" }), liveSub: { status: "active", scheduled_change: null, period_end: null } });
  assert.equal((await handleCheckout(none.deps, USER, "solo")).body.reason, "period-unknown");
  assert.equal(none.calls.length, 0);
});

test("bekleyen düşürme: aynı plan tekrar istenirse 'already'; farklı düşük plan istenirse değiştirilir; mevcut plana tıklamak iptal eder", async () => {
  const pend = sub({ plan: "studio", pending_plan: "personal", pending_plan_at: PERIOD_END });
  const again = build({ existing: pend });
  assert.equal((await handleCheckout(again.deps, USER, "personal")).body.already, true);
  assert.equal(again.calls.length, 0);
  const swap = build({ existing: pend });
  assert.equal((await handleCheckout(swap.deps, USER, "solo")).body.scheduled, true);
  assert.deepEqual(swap.calls, [`pending:solo:${PERIOD_END}`]);
  const cancel = build({ existing: pend });
  assert.deepEqual((await handleCheckout(cancel.deps, USER, "studio")).body, { ok: true, pendingCleared: true });
  assert.deepEqual(cancel.calls, ["clearPending"]);
});

test("bekleyen düşürme yazılamazsa fail-closed (provider-error), Paddle'a dokunulmaz", async () => {
  const b = build({ existing: sub({ plan: "studio" }), pendingFails: true });
  assert.equal((await handleCheckout(b.deps, USER, "personal")).body.reason, "provider-error");
  assert.equal(b.calls.length, 0);
});

test("bekleyen düşürme varken yükseltme yapılabilir (webhook plan değişince bekleyeni temizler)", async () => {
  const b = build({ existing: sub({ plan: "solo", pending_plan: "personal", pending_plan_at: PERIOD_END }) });
  assert.deepEqual((await handleCheckout(b.deps, USER, "studio")).body, { ok: true, changed: true, direction: "upgrade" });
  assert.deepEqual(b.calls, ["change:sub_A:pri_t:prorated_immediately"]);
});

test("aynı plan, past_due, paused: hiçbir Paddle çağrısı yok", async () => {
  for (const [ex, plan, reason] of [
    [sub({ plan: "solo" }), "solo", "same-plan"],
    [sub({ status: "past_due" }), "solo", "payment-issue"],
    [sub({ status: "paused" }), "solo", "paused"],
  ] as const) {
    const b = build({ existing: ex });
    assert.equal((await handleCheckout(b.deps, USER, plan)).body.reason, reason);
    assert.equal(b.calls.length, 0);
  }
});

test("Paddle tarafında bekleyen iptal/değişiklik varsa plan değişmez ('scheduled-change-pending')", async () => {
  const b = build({ existing: sub(), liveSub: { status: "active", scheduled_change: { action: "cancel" } } });
  const r = await handleCheckout(b.deps, USER, "solo");
  assert.equal(r.body.reason, "scheduled-change-pending");
  assert.equal(b.calls.length, 0);
});

test("DB 'active' ama Paddle'da aktif değil / bulunamadı: plan değişmez", async () => {
  const gone = build({ existing: sub(), liveSub: null });
  assert.equal((await handleCheckout(gone.deps, USER, "solo")).body.reason, "subscription-inconsistent");
  const canceled = build({ existing: sub(), liveSub: { status: "canceled", scheduled_change: null } });
  assert.equal((await handleCheckout(canceled.deps, USER, "solo")).body.reason, "subscription-not-active");
  const pd = build({ existing: sub(), liveSub: { status: "past_due", scheduled_change: null } });
  assert.equal((await handleCheckout(pd.deps, USER, "solo")).body.reason, "payment-issue");
});

test("Paddle plan değişikliğini reddederse 'provider-error' ve yeni abonelik açılmaz", async () => {
  const b = build({ existing: sub(), changeFails: true });
  const r = await handleCheckout(b.deps, USER, "solo");
  assert.equal(r.body.reason, "provider-error");
  assert.equal(b.calls.filter((c) => c.startsWith("create")).length, 0);
});

test("iptal edilmiş abonelik sonrası yeniden abonelik: yeni checkout açılır", async () => {
  const b = build({ existing: sub({ plan: "free", status: "canceled" }) });
  assert.equal((await handleCheckout(b.deps, USER, "personal")).body.ok, true);
  assert.deepEqual(b.calls, ["create:pri_p:personal"]);
});

test("veritabanı okuma hatası: fail-closed (ödeme açılmaz)", async () => {
  const b = build();
  b.deps.getSubscription = async () => { throw new Error("db down"); };
  const r = await handleCheckout(b.deps, USER, "solo");
  assert.equal(r.body.ok, false);
  assert.equal(b.calls.length, 0);
});

test("sandbox izolasyonu: izinli olmayan kullanıcı not-allowed; Paddle/kilit/DB'ye dokunulmaz", async () => {
  const b = build({ allowed: false });
  const r = await handleCheckout(b.deps, USER, "personal");
  assert.deepEqual(r.body, { ok: false, reason: "not-allowed" });
  assert.equal(b.calls.length, 0);
});
