// Negatif test: ilaç modülü kaldırıldı (H-06). Arayüzde, rotada ve istemci kodunda ilaç tablosuna erişim olmamalı.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { medNotificationIds } from "../../src/lib/medRemindersCleanup.ts";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test("istemci kodu medications / medication_logs tablolarına erişmiyor", () => {
  const files = walk("src").filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes(join("src", "i18n")));
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    assert.ok(!/from\(\s*["'`]medication/.test(s), `${f} ilaç tablosuna erişiyor`);
  }
});

test("Dashboard'da ilaç menüsü ve görünümü yok", () => {
  const s = readFileSync("src/screens/Dashboard.tsx", "utf8");
  assert.ok(!s.includes('"medications"'));
  assert.ok(!s.includes("MedicationsScreen"));
});

test("eski ilaç bildirimleri seçilir, diğer bildirimlere dokunulmaz", () => {
  const ids = medNotificationIds([
    { id: 1, extra: { kind: "med" } },
    { id: 2, extra: { kind: "calendar" } },
    { id: 3 },
  ]);
  assert.deepEqual(ids, [{ id: 1 }]);
});
