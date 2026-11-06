// Planmoy — AI kullanım hakkı (salt-okunur). TEK GERÇEK KAYNAK: sunucu. İstemci hiçbir değer gönderemez; yalnızca oturumu okunur.
// Dönen sayılar rezervasyon sayacıyla (user_usage_cost.text_queries) AYNI satırdan gelir → sayaç ve maliyet kontrolü birlikte çalışır.
// Okunamazsa uydurma kalan değer DÖNMEZ (ok:false). Dolar tutarı/maliyet ASLA döndürülmez.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { getEntitlement } from "../_shared/cost-cap.ts";
import { policyFor } from "../_shared/paid-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, reason: "no-auth" }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ ok: false, reason: "invalid-session" }, 401);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { plan, periodInfo } = await getEntitlement(admin, user.id);
    const limit = policyFor(plan).textQueries;
    if (plan === "free") {
      return json({ ok: true, plan, limit: 0, used: 0, remaining: 0, resetAt: null, approximate: false });
    }
    const { data, error } = await admin.from("user_usage_cost").select("text_queries").eq("user_id", user.id).eq("month", periodInfo.key).maybeSingle();
    if (error) return json({ ok: false, reason: "unavailable" });
    const used = Math.max(0, Number(data?.text_queries ?? 0) || 0);
    return json({ ok: true, plan, limit, used, remaining: Math.max(limit - used, 0), resetAt: periodInfo.resetAt, approximate: periodInfo.approximate });
  } catch {
    return json({ ok: false, reason: "unavailable" });
  }
});
