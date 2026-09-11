// Planmoy — Paylaşılan profili token ile getir
//
// Herkese açık RLS politikası YOK (kasıtlı) — bu fonksiyon service_role
// ile çalışıp SADECE token'a uyan tek satırı döndürür. Böylece anon bir
// istemci "tüm profilleri listele" yapamaz, yalnızca elindeki linkteki
// tek profili görebilir.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, reason: "method-not-allowed" }), { status: 405 });
  }
  const { token } = await req.json();
  if (!token) {
    return new Response(JSON.stringify({ ok: false, reason: "no-token" }), { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin
    .from("public_profiles")
    .select("nickname, age, gender, plans, places, interests, active")
    .eq("share_token", token)
    .maybeSingle();

  if (error || !data || !data.active) {
    return new Response(JSON.stringify({ ok: false, reason: "not-found" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, profile: data }), {
    headers: { "Content-Type": "application/json" },
  });
});
