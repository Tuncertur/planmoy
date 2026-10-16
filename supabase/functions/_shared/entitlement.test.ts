import test from "node:test";
import assert from "node:assert/strict";
import { CANCEL_LAG_MS, effectivePlan, graceEndsAt, PAST_DUE_GRACE_MS } from "./entitlement.ts";

const NOW = Date.UTC(2026, 9, 16, 12, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString();

test("active: plan geçerli; bilinmeyen/free/boş plan -> free", () => {
  assert.equal(effectivePlan({ plan: "solo", status: "active" }, NOW), "solo");
  for (const plan of ["free", "enterprise", "", null, undefined]) assert.equal(effectivePlan({ plan, status: "active" }, NOW), "free");
  assert.equal(effectivePlan(null, NOW), "free");
  assert.equal(effectivePlan(undefined, NOW), "free");
});

test("paused / canceled / bilinmeyen durum -> free", () => {
  for (const status of ["paused", "canceled", "trialing_x", "", null, undefined]) assert.equal(effectivePlan({ plan: "studio", status }, NOW), "free");
});

test("dönem sonu iptali planlı: tarihe kadar (ve +12 sa payına kadar) hak sürer, sonra kapanır", () => {
  const row = (at: number) => ({ plan: "personal", status: "active", scheduled_action: "cancel", cancel_at: iso(at) });
  assert.equal(effectivePlan(row(NOW + 86400000), NOW), "personal");
  assert.equal(effectivePlan(row(NOW - 1000), NOW), "personal"); // webhook gecikmesi payı
  assert.equal(effectivePlan(row(NOW - CANCEL_LAG_MS - 1000), NOW), "free"); // webhook kaçırılsa da kapanır
  assert.equal(effectivePlan({ plan: "personal", status: "active", scheduled_action: "pause", cancel_at: iso(NOW - 99999999) }, NOW), "personal"); // yalnız cancel kapatır
});

test("past_due: 3 gün hoşgörü; since yok/geçersiz ise hak YOK", () => {
  const pd = (since: string | null | undefined) => ({ plan: "solo", status: "past_due", past_due_since: since });
  assert.equal(effectivePlan(pd(iso(NOW - 1000)), NOW), "solo");
  assert.equal(effectivePlan(pd(iso(NOW - PAST_DUE_GRACE_MS + 1000)), NOW), "solo");
  assert.equal(effectivePlan(pd(iso(NOW - PAST_DUE_GRACE_MS)), NOW), "free");
  assert.equal(effectivePlan(pd(iso(NOW - PAST_DUE_GRACE_MS - 1000)), NOW), "free");
  for (const bad of [null, undefined, "", "bozuk"]) assert.equal(effectivePlan(pd(bad as any), NOW), "free");
});

test("graceEndsAt yalnızca past_due için hesaplanır", () => {
  const since = iso(NOW - 1000);
  assert.equal(graceEndsAt({ status: "past_due", past_due_since: since }), iso(NOW - 1000 + PAST_DUE_GRACE_MS));
  assert.equal(graceEndsAt({ status: "active", past_due_since: since }), null);
  assert.equal(graceEndsAt({ status: "past_due", past_due_since: "bozuk" }), null);
  assert.equal(graceEndsAt(null), null);
});
