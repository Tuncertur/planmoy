// Planmoy BAŞLANGIÇ (soğuk açılış) regresyon testi — "boş beyaz ekran" sınıfı hataları yakalar.
// Gerçek iOS Simulator/cihaz testi DEĞİLDİR: Chromium + taklit iOS köprüsü (window.webkit.messageHandlers.bridge).
// Çalıştırma: npm run test:baslangic   (playwright gerekir: npx playwright install chromium)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // CJS çözümleme: global kurulumu da bulur
import { execSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { join, extname } from "node:path";

const OUT = join(process.cwd(), ".test-dist");
rmSync(OUT, { recursive: true, force: true });
// Ağ erişimi olmayan sahte Supabase adresiyle derle: test hiçbir gerçek servise gitmez.
execSync(`npx vite build --outDir ${OUT} --emptyOutDir`, {
  stdio: "pipe",
  env: { ...process.env, VITE_SUPABASE_URL: "http://127.0.0.1:9", VITE_SUPABASE_ANON_KEY: "test-anon-key" },
});

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };
const server = createServer((req, res) => {
  const p = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let f = join(OUT, p);
  if (!existsSync(f) || p.endsWith("/")) f = join(OUT, "index.html"); // SPA geri dönüşü
  res.setHeader("content-type", MIME[extname(f)] ?? "application/octet-stream");
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL_ = `http://127.0.0.1:${server.address().port}/`;

// iOS köprüsü taklidi: Capacitor, window.webkit.messageHandlers.bridge varsa platformu "ios" sayar.
const BRIDGES = {
  "sessiz-kopru": `window.webkit={messageHandlers:{bridge:{postMessage(){/* native yanıt vermez */}}}};`,
  "eklenti-kayitsiz": `window.webkit={messageHandlers:{bridge:{postMessage(m){const d=typeof m==="string"?JSON.parse(m):m;
     setTimeout(()=>window.Capacitor&&window.Capacitor.fromNative&&window.Capacitor.fromNative({callbackId:d.callbackId,methodName:d.methodName,pluginId:d.pluginId,success:false,error:{message:"UNIMPLEMENTED",code:"UNIMPLEMENTED"}}),0);}}}};`,
};
// Oturum katmanı arızaları (WebView'da gerçekten görülen sınıf): kilit hiç çözülmez / depolama bozuk / depolama erişimi hata verir.
const FAULTS = {
  "temiz": ``,
  "kilit-takili": `Object.defineProperty(navigator,"locks",{value:{request:()=>new Promise(()=>{})},configurable:true});`,
  "bozuk-oturum": `localStorage.setItem("sb-127-auth-token","{bozuk-json");`,
  "depolama-hatali": `Object.defineProperty(window,"localStorage",{get(){throw new Error("SecurityError")},configurable:true});`,
};

const LOGIN = /Demo olarak giriş yap|Sign in with demo/;
const MAX_MS = 15000; // kullanıcı bu süreden uzun boş ekran görmemeli
const results = [];
const browser = await chromium.launch();
for (const [bn, bsrc] of Object.entries(BRIDGES)) {
  for (const [fn, fsrc] of Object.entries(FAULTS)) {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
    await page.addInitScript(`${bsrc}\n${fsrc}`);
    await page.goto(URL_, { waitUntil: "domcontentloaded" });
    let ok = false, ms = null;
    const t0 = Date.now();
    try { await page.getByText(LOGIN).first().waitFor({ timeout: MAX_MS }); ok = true; ms = Date.now() - t0; } catch { /* zaman aşımı = boş ekran */ }
    const blank = (await page.locator("#root").innerHTML()).trim() === "";
    results.push({ kopru: bn, ariza: fn, giris_ekrani: ok ? `PASS (${ms} ms)` : `FAIL (${blank ? "BOS EKRAN" : "giris yok"})`, js_hatalari: errors.length, ilk_hata: errors[0] ?? "-" });
    await ctx.close();
  }
}
await browser.close(); server.close(); rmSync(OUT, { recursive: true, force: true });
console.table(results);
const fail = results.filter((r) => r.giris_ekrani.startsWith("FAIL"));
if (fail.length) { console.error(`BAŞARISIZ: ${fail.length}/${results.length} senaryoda giriş ekranı açılmadı`); process.exit(1); }
console.log(`GEÇTİ: ${results.length}/${results.length} senaryoda giriş ekranı ${MAX_MS / 1000} sn içinde göründü`);
