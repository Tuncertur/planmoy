import test from "node:test";
import assert from "node:assert/strict";
import { formatDate, levelFor, parseUsage, percentUsed, showsNearLimit } from "../../src/lib/aiUsageCore.ts";

const ok = { ok: true, plan: "personal", limit: 200, used: 50, remaining: 150, resetAt: "2026-11-17T00:00:00Z", approximate: false };

test("geçerli yanıt ayrıştırılır; remaining limit-used'tan türetilir", () => {
  assert.deepEqual(parseUsage(ok), { kind: "ok", plan: "personal", limit: 200, used: 50, remaining: 150, resetAt: "2026-11-17T00:00:00Z", approximate: false });
});
test("Free → free durumu", () => assert.deepEqual(parseUsage({ ok: true, plan: "free", limit: 0, used: 0, remaining: 0 }), { kind: "free" }));
test("kullanım limiti aşarsa remaining 0 (negatif yok)", () => {
  const s = parseUsage({ ...ok, used: 230, remaining: 0 });
  assert.equal(s.kind, "ok"); if (s.kind === "ok") assert.equal(s.remaining, 0);
});
test("tutarsız/bozuk/eksik yanıt → unavailable (uydurma değer yok)", () => {
  for (const bad of [null, undefined, "x", {}, { ok: false }, { ...ok, remaining: 999 }, { ...ok, used: -1 }, { ...ok, used: 1.5 }, { ...ok, limit: 0 },
    { ...ok, plan: "gold" }, { ...ok, limit: "200" }, { ok: true, plan: "personal" }, { ...ok, used: 2e9 }]) {
    assert.deepEqual(parseUsage(bad), { kind: "unavailable" }, JSON.stringify(bad));
  }
});
test("geçersiz resetAt → null (tarih uydurulmaz); approximate yalnız true ise", () => {
  const s = parseUsage({ ...ok, resetAt: "bozuk", approximate: "evet" });
  assert.equal(s.kind, "ok"); if (s.kind === "ok") { assert.equal(s.resetAt, null); assert.equal(s.approximate, false); }
});
test("yüzde ve renk kademeleri", () => {
  assert.equal(percentUsed(0, 200), 0); assert.equal(percentUsed(100, 200), 50); assert.equal(percentUsed(199, 200), 99); assert.equal(percentUsed(500, 200), 100); assert.equal(percentUsed(1, 0), 0);
  assert.equal(levelFor(99, 200), "ok"); assert.equal(levelFor(100, 200), "mid"); assert.equal(levelFor(159, 200), "mid");
  assert.equal(levelFor(160, 200), "low"); assert.equal(levelFor(199, 200), "low"); assert.equal(levelFor(200, 200), "full"); assert.equal(levelFor(1, 0), "full");
});
test("%80 bilgi eşiği: 160/200 evet, 159 hayır, 200 (dolu) hayır — dolu için ayrı mesaj", () => {
  assert.ok(showsNearLimit(160, 200)); assert.ok(!showsNearLimit(159, 200)); assert.ok(!showsNearLimit(200, 200)); assert.ok(!showsNearLimit(0, 0));
});
test("tarih biçimi: geçersiz → boş", () => {
  assert.equal(formatDate(null, "tr"), ""); assert.equal(formatDate("x", "tr"), "");
  assert.ok(formatDate("2026-11-17T12:00:00Z", "en").includes("2026"));
});
