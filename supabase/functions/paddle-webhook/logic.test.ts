// Çalıştırma: npm run test:functions   (Node'un yerleşik test koşucusu; ek bağımlılık yok)
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { isRetiredPrice, RETIRED_PRICE_IDS, LEGACY_PERSONAL_ENV } from "../_shared/paddle-core.ts";
import {
  buildPriceTierMap, claimResultFromInsertError, claimResultFromRpc, decide, parseUserAllowlist, userAllowedFor, handleEvent, mapStatus, tierFromData, userExistsFromAuthResult, verifySignature,
  type Deps, type ExistingRow, type PaidTier, type WriteRow,
} from "./logic.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const SUB_A = "sub_A";
const SUB_B = "sub_B";
const P = { personal: "pri_personal", solo: "pri_solo", studio: "pri_studio" };
const PRICE_TIER: Record<string, PaidTier> = { [P.personal]: "personal", [P.solo]: "solo", [P.studio]: "studio" };
const T0 = "2026-10-16T08:00:00.000000Z";
const T1 = "2026-10-16T08:10:00.000000Z";
const T2 = "2026-10-16T08:20:00.000000Z";
const T3 = "2026-10-16T08:30:00.000000Z";
const NOW = "2026-10-16T09:00:00.000Z";

const subData = (o: Record<string, unknown> = {}) => ({
  id: SUB_A, status: "active", customer_id: "ctm_1",
  items: [{ price: { id: P.personal } }],
  custom_data: { supabase_user_id: USER, tier: "personal" },
  current_billing_period: { ends_at: "2026-11-16T08:00:00Z" },
  ...o,
});
const txnData = (o: Record<string, unknown> = {}) => ({
  id: "txn_1", subscription_id: SUB_A, customer_id: "ctm_1",
  items: [{ price: { id: P.personal } }],
  custom_data: { supabase_user_id: USER, tier: "personal" },
  ...o,
});
const row = (o: Partial<ExistingRow> = {}): ExistingRow => ({
  plan: "personal", status: "active", paddle_subscription_id: SUB_A, last_event_at: T0, ...o,
});
const dec = (type: string, data: any, at: string, existing: ExistingRow | null) =>
  decide(type, data, at, USER, existing, PRICE_TIER, NOW);
const written = (d: ReturnType<typeof decide>) => {
  assert.equal(d.action, "write", JSON.stringify(d));
  return (d as { row: WriteRow }).row;
};

// ---------------- eşlemeler ----------------
test("buildPriceTierMap: üç plan eşlenir, aynı fiyat iki plana verilirse hata", () => {
  const env: Record<string, string> = { PADDLE_PRICE_PERSONAL: "pri_a", PADDLE_PRICE_SOLO: "pri_b", PADDLE_PRICE_STUDIO: "pri_c" };
  assert.deepEqual(buildPriceTierMap((n) => env[n]), { pri_a: "personal", pri_b: "solo", pri_c: "studio", [RETIRED_PRICE_IDS[0]]: "personal" });
  assert.deepEqual(buildPriceTierMap(() => undefined), {});
  assert.throws(() => buildPriceTierMap((n) => (n === "PADDLE_PRICE_STUDIO" ? "pri_a" : n === "PADDLE_PRICE_PERSONAL" ? "pri_a" : undefined)));
});

test("tierFromData: abonelik, işlem, belirsiz ve bilinmeyen", () => {
  assert.deepEqual(tierFromData(subData({ items: [{ price: { id: P.solo } }] }), PRICE_TIER), { kind: "tier", tier: "solo" });
  assert.deepEqual(tierFromData({ details: { line_items: [{ price_id: P.studio }] } }, PRICE_TIER), { kind: "tier", tier: "studio" });
  assert.deepEqual(tierFromData({ items: [{ price: { id: P.personal } }, { price: { id: P.solo } }] }, PRICE_TIER), { kind: "ambiguous" });
  assert.deepEqual(tierFromData({ items: [{ price: { id: "pri_baska" } }] }, PRICE_TIER), { kind: "unknown" });
  assert.deepEqual(tierFromData({}, PRICE_TIER), { kind: "unknown" });
});

test("mapStatus: Paddle durumları", () => {
  assert.deepEqual(mapStatus("active"), { status: "active", known: true });
  assert.deepEqual(mapStatus("trialing"), { status: "active", known: true });
  assert.deepEqual(mapStatus("canceled"), { status: "canceled", known: true });
  assert.deepEqual(mapStatus("paused"), { status: "paused", known: true });
  assert.deepEqual(mapStatus("past_due"), { status: "past_due", known: true });
  assert.deepEqual(mapStatus("yeni_bir_durum"), { status: "past_due", known: false });
  assert.deepEqual(mapStatus(undefined), { status: "past_due", known: false });
});

// ---------------- karar mantığı ----------------
test("ilk satın alma: subscription.created fiyat kimliğinden plan; custom_data.tier YOK SAYILIR", () => {
  const r = written(dec("subscription.created", subData({ custom_data: { supabase_user_id: USER, tier: "studio" } }), T1, null));
  assert.equal(r.plan, "personal"); // custom_data studio diyor ama fiyat personal
  assert.equal(r.status, "active");
  assert.equal(r.paddle_subscription_id, SUB_A);
  assert.equal(r.paddle_customer_id, "ctm_1");
  assert.equal(r.current_period_end, "2026-11-16T08:00:00Z");
});

test("ilk satın alma: transaction.completed önce gelirse kaydı oluşturur, sonra subscription.created aynı planı yazar", () => {
  const r = written(dec("transaction.completed", txnData(), T1, null));
  assert.equal(r.plan, "personal");
  const after = row({ last_event_at: T1 });
  const r2 = written(dec("subscription.created", subData(), T2, after));
  assert.equal(r2.plan, "personal");
});

test("HATA 1 düzeltmesi: Personal -> Solo yükseltme (custom_data hâlâ personal olsa da) Solo yazılır", () => {
  const r = written(dec("subscription.updated", subData({ items: [{ price: { id: P.solo } }] }), T2, row()));
  assert.equal(r.plan, "solo");
  assert.equal(r.status, "active");
});

test("Solo -> Studio yükseltme ve Studio -> Personal düşürme", () => {
  assert.equal(written(dec("subscription.updated", subData({ items: [{ price: { id: P.studio } }] }), T2, row({ plan: "solo" }))).plan, "studio");
  assert.equal(written(dec("subscription.updated", subData({ items: [{ price: { id: P.personal } }] }), T3, row({ plan: "studio", last_event_at: T2 }))).plan, "personal");
});

test("yükseltmeden sonra gelen transaction.completed (eski custom_data) planı GERİ ALMAZ", () => {
  const afterUpgrade = row({ plan: "solo", last_event_at: T2 });
  const d = dec("transaction.completed", txnData({ items: [{ price: { id: P.personal } }, { price: { id: P.solo } }] }), T3, afterUpgrade);
  assert.equal(d.action, "skip");
  const d2 = dec("transaction.completed", txnData({ custom_data: { supabase_user_id: USER, tier: "personal" } }), T3, afterUpgrade);
  assert.equal(d2.action, "skip");
});

test("dönem sonunda iptal planlandı (scheduled_change): erişim sürer, plan/durum active kalır", () => {
  const r = written(dec("subscription.updated", subData({ scheduled_change: { action: "cancel", effective_at: "2026-11-16T08:00:00Z" } }), T2, row()));
  assert.equal(r.status, "active");
  assert.equal(r.plan, "personal");
  assert.equal(r.current_period_end, "2026-11-16T08:00:00Z");
});

test("HATA 2 düzeltmesi: anında iptal -> canceled/free (past_due DEĞİL)", () => {
  const viaUpdated = written(dec("subscription.updated", subData({ status: "canceled" }), T2, row()));
  assert.deepEqual([viaUpdated.plan, viaUpdated.status], ["free", "canceled"]);
  const viaCanceled = written(dec("subscription.canceled", subData({ status: "canceled" }), T2, row()));
  assert.deepEqual([viaCanceled.plan, viaCanceled.status], ["free", "canceled"]);
  const noStatus = written(dec("subscription.canceled", { ...subData(), status: undefined }, T2, row()));
  assert.equal(noStatus.status, "canceled");
  assert.equal(viaCanceled.current_period_end, undefined);
});

test("başarısız ödeme: past_due plan korunur; ödeme alınınca transaction.completed active yapar; yeni abonelik açmaz", () => {
  const pd = written(dec("subscription.past_due", subData({ status: "past_due" }), T2, row()));
  assert.deepEqual([pd.plan, pd.status], ["personal", "past_due"]);
  const back = written(dec("transaction.completed", txnData(), T3, row({ status: "past_due", last_event_at: T2 })));
  assert.deepEqual([back.plan, back.status], ["personal", "active"]);
});

test("başarısız ilk ödeme: abonelik oluşmadıysa (olay yok) DB'ye hiçbir şey yazılmaz; transaction.payment_failed yok sayılır", async () => {
  const f = fake();
  const res = await handleEvent(f.deps, { event_id: "evt_pf", event_type: "transaction.payment_failed", occurred_at: T1, data: txnData() });
  assert.equal(res.status, 200);
  assert.equal(f.writes.length, 0);
  assert.equal(f.claims.length, 0);
});

test("duraklatma / devam ettirme", () => {
  assert.equal(written(dec("subscription.paused", subData({ status: "paused" }), T2, row())).status, "paused");
  assert.equal(written(dec("subscription.resumed", subData({ status: "active" }), T3, row({ status: "paused", last_event_at: T2 }))).status, "active");
});

test("sıra dışı eski olay güncel durumu bozmaz; eşit zaman damgası kabul edilir", () => {
  const cur = row({ plan: "solo", last_event_at: T3 });
  assert.equal(dec("subscription.updated", subData({ items: [{ price: { id: P.personal } }] }), T2, cur).action, "skip");
  assert.equal(dec("subscription.canceled", subData({ status: "canceled" }), T1, cur).action, "skip");
  assert.equal(dec("subscription.updated", subData({ items: [{ price: { id: P.studio } }] }), T3, cur).action, "write");
});

test("geçersiz occurred_at: yazılmaz", () => {
  assert.equal(dec("subscription.updated", subData(), "bozuk", row()).action, "skip");
  assert.equal(dec("subscription.updated", subData(), undefined as any, row()).action, "skip");
});

test("ikinci (çift) abonelik: canlı abonelik varken başka sub'ın created/transaction olayı DB'yi DEĞİŞTİRMEZ ve error seviyesinde loglanır", () => {
  const live = row({ plan: "solo" });
  const d = dec("subscription.created", subData({ id: SUB_B }), T2, live);
  assert.equal(d.action, "skip");
  assert.equal((d as any).level, "error");
  assert.match((d as any).reason, /ÇİFT ABONELİK/);
  assert.equal(dec("transaction.completed", txnData({ subscription_id: SUB_B }), T2, live).action, "skip");
  const other = dec("subscription.canceled", subData({ id: SUB_B, status: "canceled" }), T2, live);
  assert.equal(other.action, "skip"); // başka aboneliğin iptali mevcut canlı aboneliği düşürmez
});

test("eski abonelik iptal edilmişse yeni abonelik devralır", () => {
  const ended = row({ plan: "free", status: "canceled" });
  const r = written(dec("subscription.created", subData({ id: SUB_B, items: [{ price: { id: P.studio } }] }), T2, ended));
  assert.deepEqual([r.plan, r.status, r.paddle_subscription_id], ["studio", "active", SUB_B]);
});

test("bilinmeyen fiyat: aynı abonelikte plan korunur (uyarı notu), yeni abonelikte yazılmaz", () => {
  const unknown = subData({ items: [{ price: { id: "pri_yeni" } }] });
  const keep = dec("subscription.updated", unknown, T2, row({ plan: "solo" }));
  assert.equal(written(keep).plan, "solo");
  assert.match((keep as any).note, /korundu/);
  const fresh = dec("subscription.created", unknown, T2, null);
  assert.equal(fresh.action, "skip");
  assert.equal((fresh as any).level, "error");
});

test("abonelik dışı işlem (subscription_id yok) yoksayılır", () => {
  assert.equal(dec("transaction.completed", txnData({ subscription_id: null }), T1, null).action, "skip");
});

// ---------------- handleEvent (idempotency, hata ayrımı, uçtan uca) ----------------
function fake(opts: {
  existing?: ExistingRow | null; userOk?: boolean | Error; claimError?: Error; writeError?: Error;
  conflictOnce?: boolean; allowed?: boolean; releaseError?: Error; completeError?: Error; priceTier?: Record<string, PaidTier>; bySub?: string | null;
} = {}) {
  let store: ExistingRow | null = opts.existing === undefined ? null : opts.existing;
  const claimed = new Map<string, "leased" | "done">(); // 0031: kira (leased) / tamamlandı (done)
  const f = {
    completes: [] as string[], expireLease(id: string) { if (claimed.get(id) === "leased") claimed.delete(id); },
    writes: [] as WriteRow[], claims: [] as string[], releases: [] as string[], logs: { error: [] as unknown[][], warn: [] as unknown[][] },
    get store() { return store; },
    deps: null as unknown as Deps,
  };
  let conflicts = opts.conflictOnce ? 1 : 0;
  f.deps = {
    priceTier: opts.priceTier ?? PRICE_TIER,
    now: () => NOW,
    log: { info: () => {}, warn: (...a) => f.logs.warn.push(a), error: (...a) => f.logs.error.push(a) },
    async claimEvent(id) {
      if (opts.claimError) throw opts.claimError;
      f.claims.push(id);
      const st = claimed.get(id);
      if (st === "done") return "duplicate";
      if (st === "leased") return "in-progress";
      claimed.set(id, "leased");
      return "claimed";
    },
    async completeEvent(id) {
      if (opts.completeError) throw opts.completeError;
      f.completes.push(id); claimed.set(id, "done");
    },
    async releaseEvent(id) {
      if (opts.releaseError) throw opts.releaseError;
      f.releases.push(id); claimed.delete(id);
    },
    async userExists() {
      if (opts.userOk instanceof Error) throw opts.userOk;
      return opts.userOk ?? true;
    },
    userAllowed() { return opts.allowed ?? true; },
    async findUserBySubscription() { return opts.bySub === undefined ? null : opts.bySub; },
    async getSubscription() { return store; },
    async writeSubscription(_u, _expected, r) {
      if (opts.writeError) throw opts.writeError;
      if (conflicts > 0) { conflicts--; return "conflict"; }
      f.writes.push(r);
      store = { plan: r.plan, status: r.status, paddle_subscription_id: r.paddle_subscription_id ?? null, last_event_at: r.last_event_at };
      return "ok";
    },
  };
  return f;
}
const ev = (id: string, type: string, at: string, data: any) => ({ event_id: id, event_type: type, occurred_at: at, data });

test("tekrarlanan webhook: aynı event_id ikinci kez işlenmez (tek yazma, ikincisi duplicate)", async () => {
  const f = fake();
  const e = ev("evt_1", "subscription.created", T1, subData());
  const r1 = await handleEvent(f.deps, e);
  const r2 = await handleEvent(f.deps, e);
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal(r2.body.duplicate, true);
  assert.equal(f.writes.length, 1);
});

test("idempotency: unique ihlali dışındaki claim hatası 500 döner, olay yutulmaz, yazma yapılmaz", async () => {
  const f = fake({ claimError: new Error("connection refused") });
  const r = await handleEvent(f.deps, ev("evt_1", "subscription.created", T1, subData()));
  assert.equal(r.status, 500);
  assert.equal(f.writes.length, 0);
  assert.equal(f.releases.length, 0); // henüz claim edilmedi, silinecek işaret yok
});

test("yazma hatası: 500, işaret kaldırılır (Paddle yeniden denediğinde işlenir) ve yeniden deneme başarılı olur", async () => {
  const bad = fake({ writeError: new Error("db down") });
  const r = await handleEvent(bad.deps, ev("evt_9", "subscription.created", T1, subData()));
  assert.equal(r.status, 500);
  assert.deepEqual(bad.releases, ["evt_9"]);
  // aynı store üzerinde sorun giderilmiş gibi yeniden dene
  const ok = fake();
  assert.equal((await handleEvent(ok.deps, ev("evt_9", "subscription.created", T1, subData()))).status, 200);
  assert.equal(ok.writes.length, 1);
});

test("işaret silinemezse hata loglanır ama yanıt yine 500", async () => {
  const f = fake({ writeError: new Error("db down"), releaseError: new Error("db down") });
  const r = await handleEvent(f.deps, ev("evt_1", "subscription.created", T1, subData()));
  assert.equal(r.status, 500);
  assert.ok(f.logs.error.some((l) => String(l[0]).includes("işareti kaldırılamadı")));
});

test("userExists hatası 'kullanıcı yok' sayılmaz: 500; açık 'yok' yanıtı 200 skipped", async () => {
  const err = fake({ userOk: new Error("network") });
  assert.equal((await handleEvent(err.deps, ev("evt_1", "subscription.created", T1, subData()))).status, 500);
  assert.equal(err.writes.length, 0);
  assert.deepEqual(err.releases, ["evt_1"]);
  const gone = fake({ userOk: false });
  const r = await handleEvent(gone.deps, ev("evt_2", "subscription.created", T1, subData()));
  assert.equal(r.status, 200);
  assert.equal(r.body.skipped, "user-not-found");
  assert.equal(gone.writes.length, 0);
});

test("eşzamanlı yazma çakışması 500 (yeniden dene) döner; ikinci denemede başarılı", async () => {
  const f = fake({ conflictOnce: true });
  assert.equal((await handleEvent(f.deps, ev("evt_1", "subscription.created", T1, subData()))).status, 500);
  assert.equal((await handleEvent(f.deps, ev("evt_1", "subscription.created", T1, subData()))).status, 200);
  assert.equal(f.writes.length, 1);
});

test("fiyat secret'ları boşsa yapılandırma hatası: 500 (sessizce yutulmaz)", async () => {
  const f = fake({ priceTier: {} });
  const r = await handleEvent(f.deps, ev("evt_1", "subscription.created", T1, subData()));
  assert.equal(r.status, 500);
  assert.equal(f.writes.length, 0);
});

test("geçersiz kullanıcı UUID'si ve kullanıcı bağlanamayan olay: 200 skipped (kalıcı hata, sonsuz yeniden deneme yok)", async () => {
  const f = fake();
  const bad = await handleEvent(f.deps, ev("evt_1", "subscription.created", T1, subData({ custom_data: { supabase_user_id: "yok-boyle-id" } })));
  assert.equal(bad.body.skipped, "invalid-user-id");
  const none = await handleEvent(f.deps, ev("evt_2", "subscription.created", T1, subData({ custom_data: null })));
  assert.equal(none.body.skipped, "no-user");
  assert.equal(f.writes.length, 0);
});

test("custom_data yoksa kullanıcı mevcut abonelik kaydından bulunur", async () => {
  const f = fake({ bySub: USER, existing: row() });
  const r = await handleEvent(f.deps, ev("evt_1", "subscription.updated", T2, subData({ custom_data: null, items: [{ price: { id: P.solo } }] })));
  assert.equal(r.status, 200);
  assert.equal(f.writes[0].plan, "solo");
});

test("ilgisiz olay türleri talep edilmeden (claim) yoksayılır", async () => {
  const f = fake();
  for (const t of ["customer.created", "customer.updated", "address.created", "transaction.payment_failed"]) {
    assert.equal((await handleEvent(f.deps, ev("evt_" + t, t, T1, {}))).status, 200);
  }
  assert.equal(f.claims.length, 0);
});

test("uçtan uca yaşam döngüsü: satın alma -> yükseltmeler -> geç gelen eski olay -> dönem sonu iptal -> anında iptal", async () => {
  const f = fake();
  const seq: Array<[string, any, string, string]> = [
    ["subscription.created", subData(), T0, "personal/active"],
    ["transaction.completed", txnData(), "2026-10-16T08:00:01.000000Z", "personal/active"],
    ["subscription.updated", subData({ items: [{ price: { id: P.solo } }] }), T1, "solo/active"],
    ["transaction.completed", txnData({ items: [{ price: { id: P.personal } }] }), "2026-10-16T08:10:01.000000Z", "solo/active"],
    ["subscription.updated", subData({ items: [{ price: { id: P.studio } }] }), T2, "studio/active"],
    // GEÇ GELEN eski olay (T1 < T2): Solo'ya geri DÖNMEMELİ
    ["subscription.updated", subData({ items: [{ price: { id: P.solo } }] }), T1, "studio/active"],
    ["subscription.updated", subData({ items: [{ price: { id: P.studio } }], scheduled_change: { action: "cancel" } }), T3, "studio/active"],
    ["subscription.canceled", subData({ status: "canceled", items: [{ price: { id: P.studio } }] }), "2026-10-16T08:40:00.000000Z", "free/canceled"],
  ];
  let n = 0;
  for (const [type, data, at, expected] of seq) {
    const r = await handleEvent(f.deps, ev(`evt_${n++}`, type, at, data));
    assert.equal(r.status, 200, type);
    assert.equal(`${f.store!.plan}/${f.store!.status}`, expected, `${type} @ ${at}`);
  }
});

// ---------------- imza ----------------
const SECRET = "pdl_ntfset_test_secret";
const sign = (body: string, ts: number, secret = SECRET) => createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
const NOWMS = Date.UTC(2026, 9, 16, 9, 0, 0);
const TS = Math.floor(NOWMS / 1000);

test("imza: geçerli imza kabul, değiştirilmiş gövde/yanlış secret/eksik başlık/eksik secret reddedilir", async () => {
  const body = JSON.stringify({ a: 1 });
  const hdr = `ts=${TS};h1=${sign(body, TS)}`;
  assert.equal(await verifySignature(body, hdr, SECRET, NOWMS), true);
  assert.equal(await verifySignature(body + " ", hdr, SECRET, NOWMS), false);
  assert.equal(await verifySignature(body, hdr, "baska_secret", NOWMS), false);
  assert.equal(await verifySignature(body, null, SECRET, NOWMS), false);
  assert.equal(await verifySignature(body, "ts=1", SECRET, NOWMS), false);
  assert.equal(await verifySignature(body, hdr, undefined, NOWMS), false);
  assert.equal(await verifySignature(body, `ts=${TS};h1=`, SECRET, NOWMS), false);
});

test("imza: zaman penceresi (4 gün) ve çift h1 (secret döndürme)", async () => {
  const body = "{}";
  const old = TS - 5 * 24 * 3600;
  assert.equal(await verifySignature(body, `ts=${old};h1=${sign(body, old)}`, SECRET, NOWMS), false);
  const recent = TS - 3 * 24 * 3600;
  assert.equal(await verifySignature(body, `ts=${recent};h1=${sign(body, recent)}`, SECRET, NOWMS), true);
  assert.equal(await verifySignature(body, `ts=${TS};h1=${"0".repeat(64)};h1=${sign(body, TS)}`, SECRET, NOWMS), true);
  assert.equal(await verifySignature(body, `ts=${TS};h1=${"0".repeat(64)};h1=${"1".repeat(64)}`, SECRET, NOWMS), false);
});

// ---------------- hata sınıflandırması ----------------
test("claim: yalnızca 23505 duplicate; bağlantı/izin/diğer hatalar FIRLATILIR (olay yutulmaz)", () => {
  assert.equal(claimResultFromInsertError(null), "claimed");
  assert.equal(claimResultFromInsertError({ code: "23505", message: "duplicate key" }), "duplicate");
  for (const e of [{ code: "42501", message: "permission denied" }, { code: "08006", message: "connection failure" }, { code: "42P01", message: "relation does not exist" }, { message: "fetch failed" }]) {
    assert.throws(() => claimResultFromInsertError(e), /insert hatası/);
  }
});

test("userExists: yalnızca açık 404/user_not_found 'yok'; belirsiz hata 'yok' DEĞİLDİR", () => {
  assert.equal(userExistsFromAuthResult({ user: { id: "x" } }, null), true);
  assert.equal(userExistsFromAuthResult({ user: null }, null), false);
  assert.equal(userExistsFromAuthResult(null, { status: 404 }), false);
  assert.equal(userExistsFromAuthResult(null, { code: "user_not_found" }), false);
  assert.throws(() => userExistsFromAuthResult(null, { status: 500 }), /getUserById/);
  assert.throws(() => userExistsFromAuthResult(null, { status: 401, code: "bad_jwt" }), /getUserById/);
  assert.throws(() => userExistsFromAuthResult(null, {}), /getUserById/);
});

// ---------------- 0029 alanları: hoşgörü, bekleyen iptal, bekleyen düşürme ----------------
test("past_due_since: ilk past_due anı kaydedilir, tekrar eden past_due'da KORUNUR, active'e dönünce temizlenir", () => {
  const first = written(dec("subscription.past_due", subData({ status: "past_due" }), T2, row()));
  assert.equal(first.past_due_since, T2);
  const again = written(dec("subscription.updated", subData({ status: "past_due" }), T3, row({ status: "past_due", last_event_at: T2, past_due_since: T2 })));
  assert.equal(again.past_due_since, T2); // hoşgörü süresi her olayla sıfırlanmaz
  const recovered = written(dec("transaction.completed", txnData(), T3, row({ status: "past_due", last_event_at: T2, past_due_since: T2 })));
  assert.equal(recovered.past_due_since, null);
  const active = written(dec("subscription.updated", subData(), T3, row({ status: "past_due", last_event_at: T2, past_due_since: T2 })));
  assert.equal(active.past_due_since, null);
  const canceled = written(dec("subscription.canceled", subData({ status: "canceled" }), T3, row({ status: "past_due", last_event_at: T2, past_due_since: T2 })));
  assert.equal(canceled.past_due_since, null);
});

test("past_due_since: başka abonelikten devralınan kayıtta eski anı taşımaz", () => {
  const ended = row({ plan: "free", status: "canceled", past_due_since: T0 });
  const r = written(dec("subscription.created", subData({ id: SUB_B, status: "past_due" }), T2, ended));
  assert.equal(r.past_due_since, T2);
});

test("bekleyen iptal: scheduled_change -> cancel_at/scheduled_action; kalkarsa ya da iptal olursa temizlenir", () => {
  const eff = "2026-11-16T08:00:00Z";
  const set = written(dec("subscription.updated", subData({ scheduled_change: { action: "cancel", effective_at: eff } }), T2, row()));
  assert.deepEqual([set.scheduled_action, set.cancel_at], ["cancel", eff]);
  const pause = written(dec("subscription.updated", subData({ scheduled_change: { action: "pause", effective_at: eff } }), T2, row()));
  assert.deepEqual([pause.scheduled_action, pause.cancel_at], ["pause", eff]);
  const cleared = written(dec("subscription.updated", subData({ scheduled_change: null }), T3, row({ last_event_at: T2 })));
  assert.deepEqual([cleared.scheduled_action, cleared.cancel_at], [null, null]);
  const canceled = written(dec("subscription.canceled", subData({ status: "canceled", scheduled_change: { action: "cancel", effective_at: eff } }), T3, row()));
  assert.deepEqual([canceled.scheduled_action, canceled.cancel_at], [null, null]);
  const weird = written(dec("subscription.updated", subData({ scheduled_change: { action: "delete", effective_at: eff } }), T2, row()));
  assert.deepEqual([weird.scheduled_action, weird.cancel_at], [null, null]);
});

test("transaction olayları bekleyen iptal alanlarına DOKUNMAZ (undefined)", () => {
  const r = written(dec("transaction.completed", txnData(), T3, row({ status: "past_due", last_event_at: T2 })));
  assert.equal("scheduled_action" in r, false);
  assert.equal("cancel_at" in r, false);
});

test("dönem sonu düşürme isteği: plan değişince/iptalde temizlenir, aynı planda yenilemede korunur", () => {
  const pending = row({ plan: "studio", pending_plan: "personal", pending_plan_at: "2026-11-16T00:00:00Z" });
  const renewal = written(dec("subscription.updated", subData({ items: [{ price: { id: P.studio } }] }), T2, pending));
  assert.equal("pending_plan" in renewal, false); // dokunulmadı: korunur
  const upgraded = written(dec("subscription.updated", subData({ items: [{ price: { id: P.solo } }] }), T2, row({ plan: "personal", pending_plan: "personal", pending_plan_at: "2026-11-16T00:00:00Z" })));
  assert.deepEqual([upgraded.pending_plan, upgraded.pending_plan_at], [null, null]);
  const applied = written(dec("subscription.updated", subData({ items: [{ price: { id: P.personal } }] }), T2, pending));
  assert.deepEqual([applied.plan, applied.pending_plan], ["personal", null]);
  const canceled = written(dec("subscription.canceled", subData({ status: "canceled" }), T2, pending));
  assert.deepEqual([canceled.pending_plan, canceled.pending_plan_at], [null, null]);
});

test("sandbox izolasyonu: izinli olmayan kullanıcının olayı DB'ye YAZILMAZ (200 skipped, error log)", async () => {
  const f = fake({ allowed: false });
  const r = await handleEvent(f.deps, ev("evt_1", "subscription.created", T1, subData()));
  assert.equal(r.status, 200);
  assert.equal(r.body.skipped, "user-not-allowed");
  assert.equal(f.writes.length, 0);
  assert.ok(f.logs.error.length > 0);
});

test("parseUserAllowlist/userAllowedFor: sandbox yalnız listedekileri, production herkesi, belirsiz ortam kimseyi kabul etmez", () => {
  const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
  const allow = parseUserAllowlist(` ${A.toUpperCase()}, not-a-uuid ,`);
  assert.equal(allow.size, 1);
  assert.equal(userAllowedFor("sandbox", allow, A), true);
  assert.equal(userAllowedFor("sandbox", allow, B), false);
  assert.equal(userAllowedFor("sandbox", parseUserAllowlist(""), A), false); // boş liste => kimse
  assert.equal(userAllowedFor("production", allow, B), true);
  assert.equal(userAllowedFor(null, allow, A), false);
});

// ---------------- emekli fiyat ($1.99 Personal) ----------------
const OLD = RETIRED_PRICE_IDS[0];
test("emekli fiyat: güncel Personal olarak yapılandırılırsa HATA (yeni satışta kullanılamaz)", () => {
  const env: Record<string, string> = { PADDLE_PRICE_PERSONAL: OLD, PADDLE_PRICE_SOLO: "pri_b", PADDLE_PRICE_STUDIO: "pri_c" };
  assert.throws(() => buildPriceTierMap((n) => env[n]), /emekli/);
  assert.equal(isRetiredPrice(OLD), true);
  assert.equal(isRetiredPrice("pri_01m5h6xrat23s761n7kaenf5m6"), false);
  assert.equal(isRetiredPrice(undefined), false);
});
test("emekli fiyat: eski aboneler 'personal' tanınır; yeni fiyat ve diğer planlar etkilenmez; legacy env eklenir", () => {
  const env: Record<string, string> = { PADDLE_PRICE_PERSONAL: "pri_new", PADDLE_PRICE_SOLO: "pri_b", PADDLE_PRICE_STUDIO: "pri_c", [LEGACY_PERSONAL_ENV]: "pri_old2, pri_old3" };
  const m = buildPriceTierMap((n) => env[n]);
  assert.equal(m[OLD], "personal");
  assert.equal(m.pri_old2, "personal");
  assert.equal(m.pri_old3, "personal");
  assert.equal(m.pri_new, "personal");
  assert.equal(m.pri_b, "solo");
  assert.throws(() => buildPriceTierMap((n) => ({ ...env, [LEGACY_PERSONAL_ENV]: "pri_b" } as Record<string, string>)[n]), /başka bir plana/);
});
test("emekli fiyat: eski fiyatlı Personal abonenin yenileme/başarısız ödeme olayı planı DEĞİŞTİRMEZ (personal kalır)", () => {
  const map = buildPriceTierMap((n) => ({ PADDLE_PRICE_PERSONAL: "pri_new", PADDLE_PRICE_SOLO: "pri_b", PADDLE_PRICE_STUDIO: "pri_c" } as Record<string, string>)[n]);
  const data = subData({ items: [{ price: { id: OLD } }] });
  const d = decide("subscription.updated", data, T2, USER, row(), map, NOW);
  assert.equal((d as { row: WriteRow }).row.plan, "personal");
  assert.equal((d as { row: WriteRow }).row.status, "active");
});

// ---- 0031: claim-then-crash olay kaybı kapatıldı ----
test("0031 ÇÖKME: claim sonrası süreç ölürse (complete/release yok) olay kaybolmaz; kira dolunca yeniden işlenir", async () => {
  const f = fake({ writeError: new Error("OOM"), releaseError: new Error("db down") }); // yazma çöker, kira bırakılamaz
  const e = ev("evt_c", "subscription.created", T1, subData());
  assert.equal((await handleEvent(f.deps, e)).status, 500);
  assert.equal(f.completes.length, 0);
  // kira dolmadan gelen yeniden deneme: başkası işliyor -> 503 (Paddle tekrar dener), yazma yok
  const r2 = await handleEvent(f.deps, e);
  assert.equal(r2.status, 503);
  assert.equal(f.writes.length, 0);
  // kira doldu (DB tarafı: claimed_at eski) ve sorun giderildi -> devralınır, olay İŞLENİR
  f.expireLease("evt_c");
  const ok = fake({ existing: null });
  const r3 = await handleEvent(ok.deps, e);
  assert.equal(r3.status, 200);
  assert.equal(ok.writes.length, 1);
  assert.deepEqual(ok.completes, ["evt_c"]);
});

test("0031: başarılı işleme completeEvent çağırır; ikinci teslimat duplicate (çift yazma yok)", async () => {
  const f = fake();
  const e = ev("evt_1", "subscription.created", T1, subData());
  assert.equal((await handleEvent(f.deps, e)).status, 200);
  assert.deepEqual(f.completes, ["evt_1"]);
  const r2 = await handleEvent(f.deps, e);
  assert.equal(r2.body.duplicate, true);
  assert.equal(f.writes.length, 1);
});

test("0031: kalıcı 'skipped' sonuçlar da tamamlanır (sonsuz yeniden deneme yok)", async () => {
  const f = fake({ userOk: false });
  const r = await handleEvent(f.deps, ev("evt_2", "subscription.created", T1, subData()));
  assert.equal(r.body.skipped, "user-not-found");
  assert.deepEqual(f.completes, ["evt_2"]);
});

test("0031: completeEvent başarısızsa 500 (olay tamamlanmadan 200 verilmez), kira bırakılır", async () => {
  const f = fake({ completeError: new Error("db down") });
  const r = await handleEvent(f.deps, ev("evt_3", "subscription.created", T1, subData()));
  assert.equal(r.status, 500);
  assert.deepEqual(f.releases, ["evt_3"]);
  assert.equal(f.writes.length, 1); // yazma yapıldı; yeniden denemede last_event_at koruması çift etkiyi engeller
});

test("0031: yazma hatası -> release -> yeniden denemede aynı store üzerinde işlenir", async () => {
  const f = fake({ conflictOnce: true });
  const e = ev("evt_4", "subscription.created", T1, subData());
  assert.equal((await handleEvent(f.deps, e)).status, 500);
  assert.deepEqual(f.releases, ["evt_4"]);
  assert.equal((await handleEvent(f.deps, e)).status, 200);
  assert.deepEqual(f.completes, ["evt_4"]);
});

test("0031: claimResultFromRpc yalnızca bilinen sonuçları kabul eder; hata/bilinmeyen FIRLATILIR", () => {
  for (const v of ["claimed", "duplicate", "in-progress"] as const) assert.equal(claimResultFromRpc(v, null), v);
  assert.throws(() => claimResultFromRpc(null, { code: "42883", message: "function does not exist" }), /claim_webhook_event hatası/);
  assert.throws(() => claimResultFromRpc("garip", null), /beklenmeyen/);
  assert.throws(() => claimResultFromRpc(undefined, null), /beklenmeyen/);
});
