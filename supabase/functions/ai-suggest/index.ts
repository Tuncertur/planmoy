// Planmoy — Genel amaçlı AI öneri fonksiyonu (Google Gemini)
//
// StyleSync, Yapay Zeka (Akışım) ve işletme önerileri gibi birden fazla
// yerde çağrılır — her çağıran kendi system/prompt metnini gönderir.
//
// Korumalar (kullanıcının "sınırsız fatura olmasın" kuralı):
//  - Giriş yapmış kullanıcı şart (anonim/çıplak çağrı reddedilir)
//  - Saatlik istek sınırı + planına göre aylık maliyet tavanı
//  - Girdi uzunluğu sınırlı (token maliyeti kontrol altında)
// GEMINI_API_KEY yoksa "missing-key" döner — uydurma öneri üretilmez.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { checkAndChargeCost } from "../_shared/cost-cap.ts";

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
// ~1500 giriş + 300 çıkış token için muhtemel üst sınır (Gemini Flash fiyatlarıyla ≈ $0.0012)
const COST_PER_CALL_USD = 0.0012;

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

  const { count } = await admin
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("surface", "ai-suggest")
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if ((count ?? 0) >= HOURLY_LIMIT) return json({ ok: false, reason: "rate-limited", suggestion: null });

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ ok: false, reason: "missing-key", suggestion: null });

  const body = await req.json().catch(() => ({}));
  const system = typeof body.system === "string" ? body.system.slice(0, MAX_SYSTEM_CHARS) : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, MAX_PROMPT_CHARS) : "";
  if (!prompt.trim()) return json({ ok: false, reason: "empty", suggestion: null });

  const costCheck = await checkAndChargeCost(admin, user.id, COST_PER_CALL_USD);
  if (!costCheck.allowed) return json({ ok: false, reason: "monthly-cost-cap-reached", suggestion: null });

  await admin.from("ai_usage_log").insert({ user_id: user.id, surface: "ai-suggest" });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      }),
    }
  );
  if (!response.ok) return json({ ok: false, reason: "provider-error", suggestion: null });

  const payload = await response.json();
  const text: string | undefined = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  return json({ ok: true, suggestion: text ?? null });
});
