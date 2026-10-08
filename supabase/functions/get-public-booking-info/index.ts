// Planmoy — /book/:slug sayfası için, SADECE o işletmenin kamuya açık
// rezervasyon bilgilerini döndürür.
//
// DÜZELTME (2. QA denetimi, F-06): businesses/services/professionals
// üzerindeki "using(true)" RLS politikaları kaldırıldı (bkz. 0025 migration)
// çünkü satır bazlı RLS sütun gizleyemiyordu ve platform genelinde veri
// sızdırıyordu. Bu fonksiyon get-shared-event/get-shared-profile ile aynı
// deseni izler: service_role ile çalışır, istenen `slug`'a ait TEK işletmeyi
// ve sadece rezervasyon formunun ihtiyaç duyduğu alanları döndürür.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, reason: "method-not-allowed" }), { status: 405, headers: corsHeaders });
  }

  const { slug } = await req.json().catch(() => ({}));
  if (!slug || typeof slug !== "string") {
    return new Response(JSON.stringify({ ok: false, reason: "no-slug" }), { status: 400, headers: corsHeaders });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Rezervasyon formunun gerçekten ihtiyaç duyduğu alanlarla sınırlı —
  // örn. işletmenin telefon numarası burada dönülmüyor.
  const { data: business } = await admin
    .from("businesses")
    .select("id, name, slug, industry, city")
    .eq("slug", slug)
    .maybeSingle();
  if (!business) {
    return new Response(JSON.stringify({ ok: false, reason: "not-found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: professional } = await admin
    .from("professionals")
    .select("id, name, role")
    .eq("business_id", business.id)
    .limit(1)
    .maybeSingle();
  const { data: service } = await admin
    .from("services")
    .select("id, name, duration_minutes, price")
    .eq("business_id", business.id)
    .limit(1)
    .maybeSingle();

  if (!professional || !service) {
    return new Response(JSON.stringify({ ok: false, reason: "not-found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(
    JSON.stringify({ ok: true, business, professional, service }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
