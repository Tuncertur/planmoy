import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReminderSlots, reminderId } from "../../src/lib/medReminders.ts";

const labels = { title: "İlaç zamanı", body: (name: string, dosage: string | null) => (dosage ? `${name} (${dosage})` : name) };

test("her ilaç saati için bir bildirim; saat/dakika doğru ayrılır", () => {
  const s = buildReminderSlots([{ id: "m1", name: "B12", dosage: "1 tablet", times: ["09:00", "21:30"] }], labels);
  assert.equal(s.length, 2);
  assert.deepEqual(s.map((x) => [x.hour, x.minute]), [[9, 0], [21, 30]]);
  assert.equal(s[0].body, "B12 (1 tablet)");
  assert.equal(s[0].title, "İlaç zamanı");
});
test("kimlik kararlıdır, pozitif 31-bit tamsayıdır ve ilaç/saat başına farklıdır", () => {
  const a = reminderId("m1", "09:00");
  assert.equal(a, reminderId("m1", "09:00"));
  assert.ok(Number.isInteger(a) && a > 0 && a < 2 ** 31);
  assert.notEqual(a, reminderId("m1", "09:01"));
  assert.notEqual(a, reminderId("m2", "09:00"));
});
test("geçersiz saatler atlanır, aynı saat tekrarı tek bildirim olur", () => {
  const s = buildReminderSlots([{ id: "m1", name: "X", dosage: null, times: ["25:00", "09:60", "abc", "9:5", "08:00", "08:00"] }], labels);
  assert.deepEqual(s.map((x) => [x.hour, x.minute]), [[8, 0]]);
});
test("pasif ilaç için bildirim üretilmez; boş liste güvenli", () => {
  assert.deepEqual(buildReminderSlots([{ id: "m1", name: "X", dosage: null, times: ["08:00"], active: false }], labels), []);
  assert.deepEqual(buildReminderSlots([], labels), []);
});
test("çok uzun ilaç adı kırpılır", () => {
  const s = buildReminderSlots([{ id: "m1", name: "A".repeat(500), dosage: null, times: ["08:00"] }], labels);
  assert.ok(s[0].body.length <= 120);
});
