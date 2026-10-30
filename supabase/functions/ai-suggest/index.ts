// Planmoy — Genel amaçlı AI öneri fonksiyonu (Google Gemini)
//
// StyleSync, Yapay Zeka (Akışım) ve işletme önerileri gibi birden fazla
// yerde çağrılır — her çağıran kendi system/prompt metnini gönderir.
//
// Maliyet korumaları (migration 0032 + _shared/paid-api.ts):
//  - Giriş yapmış kullanıcı şart; FREE plan için ücretli API KAPALI ($0)
//  - Aylık metin-sorgu hakkı: Personal 200 / Solo 500 / Studio 1000
//  - Plan başına aylık dolar tavanı + proje geneli tavan (atomik rezervasyon)
//  - Aynı istek tekrarında çift ücretlendirme yok (idempotency anahtarı)
//  - Gerçek token kullanımıyla mutabakat; sağlayıcı hatasında tam iade
//  - Maliyet bilgisi alınamazsa ücretli çağrı YAPILMAZ (fail-closed)
// GEMINI_API_KEY yoksa "missing-key" döner — uydurma öneri üretilmez.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { getPlan } from "../_shared/cost-cap.ts";
import { geminiActualUsd, geminiReserveUsd, idemKeyFor, projectCapFromEnv, publicReason, ratesFromEnv, reservePaidApi, settlePaidApi } from "../_shared/paid-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const HOURLY_LIMIT = 30;
const MAX_SYSTEM_CHARS = 2000;
const MAX_PROMPT_CHARS = 4000;
const MAX_OUTPUT_TOKENS = 300;
const PROVIDER_TIMEOUT_MS = 20_000;
// Model ve tarife ORTAM DEĞİŞKENİNDEN (model kapanışı/fiyat değişimi kod değişikliği gerektirmesin). Varsayılan: mevcut model adı.
const DEFAULT_MODEL = "gemini-2.0-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, reason: "method-not-allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, reason: "no-auth", suggestion: null }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ ok: false, reason: "invalid-session", suggestion: null }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // FREE: ücretli API yok. Saatlik sayaç/anahtar/gövde işlemlerinden ÖNCE reddedilir (hiçbir kaynak harcanmaz).
  const plan = await getPlan(admin, user.id);
  if (plan === "free") return json({ ok: false, reason: "free-plan", suggestion: null });

  const body = await req.json().catch(() => ({}));
  const system = typeof body.system === "string" ? body.system.slice(0, MAX_SYSTEM_CHARS) : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, MAX_PROMPT_CHARS) : "";
  if (!prompt.trim()) return json({ ok: false, reason: "empty", suggestion: null });

  // F-05: tek atomik RPC (bkz. 0026) — eşzamanlı istekler saatlik limiti atlatamaz.
  const { data: withinLimit, error: limitErr } = await admin.rpc("check_and_log_ai_usage", {
    p_user_id: user.id,
    p_surface: "ai-suggest",
    p_hourly_limit: HOURLY_LIMIT,
  });
  if (limitErr || !withinLimit) return json({ ok: false, reason: "rate-limited", suggestion: null });

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ ok: false, reason: "missing-key", suggestion: null });

  const model = Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
  const rates = ratesFromEnv(Deno.env.get("GEMINI_INPUT_USD_PER_M"), Deno.env.get("GEMINI_OUTPUT_USD_PER_M"));
  const reserved = geminiReserveUsd(system.length, prompt.length, MAX_OUTPUT_TOKENS, rates);

  const reservation = await reservePaidApi(admin, {
    userId: user.id,
    surface: "ai-suggest",
    amountUsd: reserved,
    plan,
    countsQuery: true,
    idemKey: idemKeyFor("ai-suggest", body.request_id, `${system}\u0000${prompt}`, Date.now()),
    projectCapUsd: projectCapFromEnv(Deno.env.get("PROJECT_MONTHLY_CAP_USD")),
  });
  if (!reservation.allowed) return json({ ok: false, reason: publicReason(reservation.reason), suggestion: null });

  let billed = false;
  let actual: number | null = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROVIDER_TIMEOUT_MS);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, // anahtar URL'de değil (günlüklere sızmaz)
      signal: ctrl.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.7 },
      }),
    }).finally(() => clearTimeout(timer));
    if (!response.ok) return json({ ok: false, reason: "provider-error", suggestion: null }); // faturalanmadı → finally'de iade
    billed = true; // 2xx: sağlayıcı ücretlendirir (JSON okuması başarısız olsa bile ihtiyatlı say)
    const payload = await response.json();
    actual = geminiActualUsd(payload?.usageMetadata, rates);
    const text: string | undefined = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    return json({ ok: true, suggestion: text ?? null });
  } catch {
    return json({ ok: false, reason: "provider-error", suggestion: null }); // zaman aşımı/ağ: faturalanmadı kabul → iade
  } finally {
    await settlePaidApi(admin, reservation.ledgerId, actual, billed, reserved);
  }
});
