import test from "node:test";
import assert from "node:assert/strict";
import { CONSERVATIVE_RATES, DEFAULT_PROJECT_CAP_USD, PLAN_POLICY, geminiActualUsd, geminiReserveUsd, idemKeyFor, monthKey, policyFor, projectCapFromEnv, publicReason, ratesFromEnv, reservePaidApi, settlePaidApi } from "./paid-api.ts";

test("kesin plan kararları: Free $0/0 sorgu; Personal 200, Solo 500, Studio 1000", () => {
  assert.deepEqual(PLAN_POLICY.free, { userCapUsd: 0, textQueries: 0 });
  assert.equal(PLAN_POLICY.personal.textQueries, 200);
  assert.equal(PLAN_POLICY.solo.textQueries, 500);
  assert.equal(PLAN_POLICY.studio.textQueries, 1000);
  assert.equal(policyFor("bilinmeyen-plan").userCapUsd, 0); // bilinmeyen plan = Free (güvenli taraf)
  assert.ok(Math.abs(PLAN_POLICY.personal.userCapUsd - 0.39) < 1e-9 && Math.abs(PLAN_POLICY.solo.userCapUsd - 1.0) < 1e-9 && Math.abs(PLAN_POLICY.studio.userCapUsd - 2.7) < 1e-9);
});

test("proje tavanı: geçersiz/negatif/boş → varsayılan; geçerli → o değer", () => {
  assert.equal(projectCapFromEnv(undefined), DEFAULT_PROJECT_CAP_USD);
  assert.equal(projectCapFromEnv("abc"), DEFAULT_PROJECT_CAP_USD);
  assert.equal(projectCapFromEnv("-5"), DEFAULT_PROJECT_CAP_USD);
  assert.equal(projectCapFromEnv("0"), DEFAULT_PROJECT_CAP_USD);
  assert.equal(projectCapFromEnv("250"), 250);
});

test("ay anahtarı UTC; ay sınırında değişir", () => {
  assert.equal(monthKey(new Date("2026-10-31T23:59:59Z")), "2026-10");
  assert.equal(monthKey(new Date("2026-11-01T00:00:00Z")), "2026-11");
});

test("tarife: ortam yoksa/ geçersizse ihtiyatlı; verilirse kullanılır", () => {
  assert.deepEqual(ratesFromEnv(undefined, undefined), CONSERVATIVE_RATES);
  assert.deepEqual(ratesFromEnv("0.25", "x"), CONSERVATIVE_RATES);
  assert.deepEqual(ratesFromEnv("0.25", "1.5"), { inputPerM: 0.25, outputPerM: 1.5 });
});

test("rezervasyon: Flash-Lite tarifesiyle 1500 token girdi + 300 çıktı ≈ $0.000825; ihtiyatlı tarifede ≈ $0.0045", () => {
  const lite = geminiReserveUsd(4500, 0, 300, { inputPerM: 0.25, outputPerM: 1.5 });
  assert.ok(Math.abs(lite - 0.000825) < 1e-9, String(lite));
  const cons = geminiReserveUsd(4500, 0, 300, CONSERVATIVE_RATES);
  assert.ok(Math.abs(cons - 0.0045) < 1e-9, String(cons));
});

test("gerçek maliyet: kullanım meta verisinden; düşünme token'ı çıktı sayılır; bilgi yoksa null", () => {
  const r = { inputPerM: 0.25, outputPerM: 1.5 };
  assert.ok(Math.abs(geminiActualUsd({ promptTokenCount: 1000, candidatesTokenCount: 200 }, r)! - (1000 * 0.25 + 200 * 1.5) / 1e6) < 1e-12);
  assert.ok(Math.abs(geminiActualUsd({ promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 500 }, r)! - (1000 * 0.25 + 700 * 1.5) / 1e6) < 1e-12);
  assert.equal(geminiActualUsd(undefined, r), null);
  assert.equal(geminiActualUsd({ candidatesTokenCount: 5 }, r), null);
  assert.equal(geminiActualUsd({ promptTokenCount: -1 }, r), null);
});

test("idempotency anahtarı: request_id öncelikli; yoksa aynı içerik 10 sn'de aynı, sonra farklı; farklı içerik farklı", () => {
  const t = 1_000_000_000;
  assert.equal(idemKeyFor("ai", "abcdefgh-1234", "x", t), "ai:rid:abcdefgh-1234");
  const a = idemKeyFor("ai", undefined, "merhaba", t), b = idemKeyFor("ai", undefined, "merhaba", t + 5_000);
  assert.equal(a, b);
  assert.notEqual(a, idemKeyFor("ai", undefined, "merhaba", t + 25_000));
  assert.notEqual(a, idemKeyFor("ai", undefined, "baska", t));
  assert.ok(idemKeyFor("ai", "!!!kotu!!!", "merhaba", t).includes(":c:")); // geçersiz request_id yok sayılır
});

const rpcOk = (data: unknown) => ({ rpc: () => Promise.resolve({ data, error: null }) });
const base = { userId: "u", surface: "ai", amountUsd: 0.001, plan: "personal", countsQuery: true, projectCapUsd: 150 };

test("rezervasyon: izin → ledgerId; red nedenleri aynen aktarılır", async () => {
  assert.deepEqual(await reservePaidApi(rpcOk({ allowed: true, reason: null, ledger_id: "L1" }), base), { allowed: true, ledgerId: "L1" });
  assert.deepEqual(await reservePaidApi(rpcOk({ allowed: false, reason: "monthly-query-limit-reached", ledger_id: null }), base), { allowed: false, reason: "monthly-query-limit-reached" });
});

test("FAIL-CLOSED: RPC hatası, null yanıt, beklenmeyen şekil, fırlatılan istisna → ücretli çağrı reddedilir", async () => {
  const denied = { allowed: false, reason: "cost-check-failed" };
  assert.deepEqual(await reservePaidApi({ rpc: () => Promise.resolve({ data: null, error: { message: "function does not exist" } }) }, base), denied);
  assert.deepEqual(await reservePaidApi(rpcOk(null), base), denied);
  assert.deepEqual(await reservePaidApi(rpcOk("evet"), base), denied);
  assert.deepEqual(await reservePaidApi(rpcOk({ allowed: true }), base), denied); // ledger yok → izin sayılmaz
  assert.deepEqual(await reservePaidApi({ rpc: () => { throw new Error("ağ"); } }, base), denied);
});

test("Free planı SQL'e tavan 0 gönderir; ücretli plan kendi tavanını/limitini gönderir", async () => {
  let sent: Record<string, unknown> = {};
  const spy = { rpc: (_f: string, a: Record<string, unknown>) => { sent = a; return Promise.resolve({ data: { allowed: false, reason: "plan-has-no-paid-api" }, error: null }); } };
  await reservePaidApi(spy, { ...base, plan: "free" });
  assert.equal(sent.p_user_cap, 0); assert.equal(sent.p_query_limit, 0);
  await reservePaidApi(spy, { ...base, plan: "solo", now: new Date("2026-12-05T10:00:00Z") });
  assert.equal(sent.p_query_limit, 500); assert.equal(sent.p_month, "2026-12"); assert.equal(sent.p_project_cap, 150);
});

test("kapanış: faturalıysa gerçek tutar, hata/zaman aşımında 0 ve billed=false; RPC hatasında false (çökmez)", async () => {
  let sent: Record<string, unknown> = {};
  const spy = { rpc: (_f: string, a: Record<string, unknown>) => { sent = a; return Promise.resolve({ data: true, error: null }); } };
  assert.equal(await settlePaidApi(spy, "L1", 0.0004, true, 0.0045), true);
  assert.deepEqual([sent.p_actual, sent.p_provider_billed], [0.0004, true]);
  await settlePaidApi(spy, "L1", null, true, 0.0045);   // sağlayıcı kullanım bildirmediyse rezerve tutar yazılır (ihtiyatlı)
  assert.equal(sent.p_actual, 0.0045);
  await settlePaidApi(spy, "L1", null, false, 0.0045);
  assert.deepEqual([sent.p_actual, sent.p_provider_billed], [0, false]);
  assert.equal(await settlePaidApi({ rpc: () => { throw new Error("x"); } }, "L1", 0, false, 0.001), false);
});

test("kullanıcıya iç ayrıntı sızmaz", () => {
  assert.equal(publicReason("plan-has-no-paid-api"), "free-plan");
  assert.equal(publicReason("project-cap-reached"), "busy");
  assert.equal(publicReason("cost-check-failed"), "unavailable");
});
