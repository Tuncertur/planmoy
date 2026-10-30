import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { getPlan } from "../_shared/cost-cap.ts";
import { idemKeyFor, projectCapFromEnv, reservePaidApi, settlePaidApi } from "../_shared/paid-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HOURLY_LIMIT = 40;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, reason: "method-not-allowed", suggestions: [] }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, reason: "no-auth", suggestions: [] }), { status: 401, headers: corsHeaders });
  }
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, reason: "invalid-session", suggestions: [] }), { status: 401, headers: corsHeaders });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // DÜZELTME (F-05): SELECT count -> INSERT yerine tek atomik RPC (bkz.
  // 0026 migration) — eşzamanlı istekler artık saatlik limiti atlatamaz.
  const { data: withinLimit, error: limitErr } = await admin.rpc("check_and_log_ai_usage", {
    p_user_id: user.id,
    p_surface: "places-autocomplete",
    p_hourly_limit: HOURLY_LIMIT,
  });
  if (limitErr || !withinLimit) {
    return new Response(JSON.stringify({ ok: false, reason: "rate-limited", suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, reason: "missing-key", suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { input, languageCode } = await req.json();
  if (!input || typeof input !== "string" || input.trim().length < 3 || input.length > 100) {
    return new Response(JSON.stringify({ ok: true, suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Maliyet: $2.83 / 1000 istek. FREE için ücretli çağrı yok ($0); ücretli planlarda rezervasyon + mutabakat/iade.
  const plan = await getPlan(admin, user.id);
  const AUTOCOMPLETE_USD = 0.00283;
  const reservation = await reservePaidApi(admin, {
    userId: user.id, surface: "places-autocomplete", amountUsd: AUTOCOMPLETE_USD, plan, countsQuery: false,
    idemKey: idemKeyFor("places-autocomplete", null, input.trim().toLowerCase(), Date.now(), 5_000),
    projectCapUsd: projectCapFromEnv(Deno.env.get("PROJECT_MONTHLY_CAP_USD")),
  });
  if (!reservation.allowed) {
    return new Response(JSON.stringify({ ok: true, suggestions: [], capReached: reservation.reason !== "duplicate-request" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let response: Response;
  try {
    response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
    body: JSON.stringify({
      input: input.trim(),
      languageCode: languageCode ?? "tr",
      includedPrimaryTypes: ["locality", "administrative_area_level_1", "administrative_area_level_2", "sublocality"],
    }),
  });
  } catch {
    await settlePaidApi(admin, reservation.ledgerId, 0, false, AUTOCOMPLETE_USD);
    return new Response(JSON.stringify({ ok: false, reason: "provider-error", suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  await settlePaidApi(admin, reservation.ledgerId, response.ok ? AUTOCOMPLETE_USD : 0, response.ok, AUTOCOMPLETE_USD);

  if (!response.ok) {
    return new Response(JSON.stringify({ ok: false, reason: "provider-error", suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const payload = await response.json();
  const suggestions = (payload.suggestions ?? [])
    .filter((s: any) => s.placePrediction)
    .slice(0, 8)
    .map((s: any) => ({ text: s.placePrediction.text?.text ?? "", placeId: s.placePrediction.placeId }));

  return new Response(JSON.stringify({ ok: true, suggestions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
