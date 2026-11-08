import { test } from "node:test";
import assert from "node:assert/strict";
import { markOAuthPending, consumeOAuthPending, OAUTH_PENDING_TTL_MS } from "../../src/lib/oauthPending.ts";
function fake() { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; }
test("başlatılmamış giriş dönüşü reddedilir", () => { assert.equal(consumeOAuthPending(fake(), 1000), false); });
test("başlatılan giriş bir kez kabul edilir, ikinci kez reddedilir", () => {
  const s = fake(); markOAuthPending(s, 1000);
  assert.equal(consumeOAuthPending(s, 2000), true);
  assert.equal(consumeOAuthPending(s, 2001), false);
});
test("süresi dolan işaret reddedilir ve silinir", () => {
  const s = fake(); markOAuthPending(s, 1000);
  assert.equal(consumeOAuthPending(s, 1000 + OAUTH_PENDING_TTL_MS + 1), false);
  assert.equal(consumeOAuthPending(s, 1500), false);
});
test("bozuk işaret ve gelecekteki zaman damgası reddedilir", () => {
  const s = fake(); s.setItem("planmoy.oauth.pending", "abc"); assert.equal(consumeOAuthPending(s, 5), false);
  markOAuthPending(s, 9000); assert.equal(consumeOAuthPending(s, 100), false);
});
test("depolama hatası güvenli tarafta reddeder", () => {
  const bad = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => {} };
  markOAuthPending(bad, 1); assert.equal(consumeOAuthPending(bad, 2), false);
});
