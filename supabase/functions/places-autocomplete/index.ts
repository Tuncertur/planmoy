import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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
  const { count } = await admin
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("surface", "places-autocomplete")
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if ((count ?? 0) >= HOURLY_LIMIT) {
    return new Response(JSON.stringify({ ok: false, reason: "rate-limited", suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  await admin.from("ai_usage_log").insert({ user_id: user.id, surface: "places-autocomplete" });

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, reason: "missing-key", suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { input, languageCode } = await req.json();
  if (!input || typeof input !== "string" || input.trim().length < 3 || input.length > 100) {
    return new Response(JSON.stringify({ ok: true, suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
    body: JSON.stringify({
      input: input.trim(),
      languageCode: languageCode ?? "tr",
      includedPrimaryTypes: ["locality", "administrative_area_level_1", "administrative_area_level_2", "sublocality"],
    }),
  });

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
