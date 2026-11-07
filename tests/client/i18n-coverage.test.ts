import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Kaynaktaki her {tr, en} çiftinin İngilizce metni, 6 dil dosyasında da bulunmalı (bilinen istisnalar hariç).
const LANGS = ["de", "fr", "es", "ar", "ru", "zh"];
// İstisna: ücret/AI-sorgu vaatleri — fiyat kararı netleşene kadar bilerek çevrilmedi (İngilizceye düşer).
const EXEMPT = new Set(["20 AI queries included when you create an account · no payment", "20 AI queries · first setup", "1,000 AI queries / month", "2,000 AI queries / month", "3,000 AI queries / month"]);

function walk(d: string, out: string[] = []): string[] {
  for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p, out); else if (/\.tsx?$/.test(p)) out.push(p); }
  return out;
}
const lit = String.raw`(?:"((?:[^"\\]|\\.)*)"|` + "`((?:[^`\\\\]|\\\\.)*)`|'((?:[^'\\\\]|\\\\.)*)')";
const pat = new RegExp(String.raw`\btr:\s*` + lit + String.raw`\s*,\s*en:\s*` + lit, "gs");

function sourceKeys(): string[] {
  const keys = new Set<string>();
  for (const f of walk("src")) {
    if (f.includes("src/i18n/")) continue;
    for (const m of readFileSync(f, "utf8").matchAll(pat)) {
      const en = m[4] ?? m[5] ?? m[6];
      if (en !== undefined && en.trim() && !en.includes("${")) keys.add(en.replace(/\\(["'`\\])/g, "$1"));
    }
  }
  return [...keys];
}
function table(l: string): Record<string, string> {
  const src = readFileSync(`src/i18n/${l}.ts`, "utf8");
  return JSON.parse(src.slice(src.indexOf("= {") + 2, src.lastIndexOf("};") + 1));
}

test("her kaynak metin 6 dilde çevrilmiş (istisnalar hariç)", () => {
  const keys = sourceKeys().filter((k) => !EXEMPT.has(k));
  assert.ok(keys.length > 600, "kaynak metinler okunamadı: " + keys.length);
  for (const l of LANGS) {
    const t = table(l);
    const missing = keys.filter((k) => !t[k] || !t[k].trim());
    assert.deepEqual(missing, [], `${l}: ${missing.length} eksik`);
  }
});
test("çeviri dosyalarında yer tutucular korunmuş", () => {
  for (const l of LANGS) {
    for (const [k, v] of Object.entries(table(l))) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      assert.equal(ph(v), ph(k), `${l}: yer tutucu uyuşmuyor: ${k.slice(0, 40)}`);
    }
  }
});
test("ru/zh/ar çevirileri İngilizce ile aynı kalmıyor (uzun metinlerde)", () => {
  for (const l of ["ru", "zh", "ar"]) {
    const same = Object.entries(table(l)).filter(([k, v]) => k === v && k.length > 12).map(([k]) => k);
    assert.deepEqual(same, [], `${l}: çevrilmemiş görünen metinler`);
  }
});
