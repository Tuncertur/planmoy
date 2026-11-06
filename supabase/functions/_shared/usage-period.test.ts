import test from "node:test";
import assert from "node:assert/strict";
import { isPeriodKey, usagePeriodFor } from "./usage-period.ts";

const NOW = Date.parse("2026-11-05T10:00:00Z");

test("ücretli + geleceğe dönük current_period_end → faturalama dönemi, kesin", () => {
  const p = usagePeriodFor({ current_period_end: "2026-11-17T08:30:00Z" }, true, NOW);
  assert.deepEqual(p, { key: "b:2026-11-17", kind: "billing", resetAt: "2026-11-17T08:30:00.000Z", approximate: false });
});
test("aynı dönem boyunca anahtar sabit (ay sınırını geçse de)", () => {
  const row = { current_period_end: "2026-12-03T00:00:00Z" };
  assert.equal(usagePeriodFor(row, true, Date.parse("2026-11-20T00:00:00Z")).key, usagePeriodFor(row, true, Date.parse("2026-12-02T23:00:00Z")).key);
});
test("yenileme sonrası dönem sonu ilerleyince anahtar değişir (sıfırlanır)", () => {
  assert.notEqual(usagePeriodFor({ current_period_end: "2026-11-17T00:00:00Z" }, true, NOW).key, usagePeriodFor({ current_period_end: "2026-12-17T00:00:00Z" }, true, NOW).key);
});
test("dönem sonu geçmişte (webhook gecikmesi) / geçersiz / yok → takvim ayı + yaklaşık", () => {
  for (const v of ["2026-11-01T00:00:00Z", "bozuk", null, undefined, ""]) {
    const p = usagePeriodFor({ current_period_end: v as string }, true, NOW);
    assert.equal(p.key, "2026-11"); assert.equal(p.kind, "calendar"); assert.equal(p.approximate, true);
    assert.equal(p.resetAt, "2026-12-01T00:00:00.000Z");
  }
});
test("Free → takvim ayı, yaklaşık DEĞİL (gerçek kural)", () => {
  const p = usagePeriodFor({ current_period_end: "2026-11-17T00:00:00Z" }, false, NOW);
  assert.equal(p.key, "2026-11"); assert.equal(p.approximate, false);
});
test("yıl sonu: takvim sıfırlama bir sonraki yıla", () => {
  assert.equal(usagePeriodFor(null, false, Date.parse("2026-12-31T23:00:00Z")).resetAt, "2027-01-01T00:00:00.000Z");
});
test("isPeriodKey", () => {
  assert.ok(isPeriodKey("2026-11") && isPeriodKey("b:2026-11-17"));
  assert.ok(!isPeriodKey("b:2026-11") && !isPeriodKey("x") && !isPeriodKey(5));
});
