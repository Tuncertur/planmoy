// Planmoy — abonelik yönetimi (müşteri portalı, dönem sonunda iptal, planlı iptali geri alma).
// Kullanıcı JWT'den doğrulanır; yalnızca KENDİ aboneliği (subscriptions satırı) işlenir. Karar mantığı logic.ts (testli).
// Secrets: PADDLE_API_KEY, PADDLE_ENVIRONMENT ("sandbox"|"production"). Eksik/belirsizse "not-configured" (fail-closed).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { handleManage, type ManageDeps } from "./logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, reason: "method-not-allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, reason: "no-auth" }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ ok: false, reason: "invalid-session" }, 401);
  if (user.is_anonymous) return json({ ok: false, reason: "anonymous-user" });

  const body = await req.json().catch(() => ({}));
  const envRaw = Deno.env.get("PADDLE_ENVIRONMENT");
  const environment = envRaw === "sandbox" || envRaw === "production" ? envRaw : null;
  const apiKey = Deno.env.get("PADDLE_API_KEY") ?? "";
  const base = environment === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const call = (method: string, path: string, b?: unknown) =>
    fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: b === undefined ? undefined : JSON.stringify(b) });
  const enc = encodeURIComponent;

  const deps: ManageDeps = {
    environment,
    hasApiKey: !!apiKey,
    async getRow(userId) {
      const { data, error } = await admin.from("subscriptions").select("plan, status, paddle_subscription_id, paddle_customer_id").eq("user_id", userId).maybeSingle();
      if (error) throw new Error(`abonelik okunamadı: ${error.message}`);
      return data;
    },
    async clearPending(userId) {
      const { error } = await admin.from("subscriptions").update({ pending_plan: null, pending_plan_at: null }).eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    paddle: {
      async getSubscription(id) {
        const res = await call("GET", `/subscriptions/${enc(id)}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Paddle abonelik okunamadı: ${res.status}`);
        const d = (await res.json())?.data;
        return d ? { status: d.status, scheduled_change: d.scheduled_change ?? null } : null;
      },
      async cancelAtPeriodEnd(id) {
        const res = await call("POST", `/subscriptions/${enc(id)}/cancel`, { effective_from: "next_billing_period" });
        if (!res.ok) throw new Error(`Paddle iptal reddedildi: ${res.status} ${await res.text().catch(() => "")}`);
      },
      async removeScheduledChange(id) {
        const res = await call("PATCH", `/subscriptions/${enc(id)}`, { scheduled_change: null });
        if (!res.ok) throw new Error(`Paddle planlı iptal kaldırılamadı: ${res.status} ${await res.text().catch(() => "")}`);
      },
      async portalUrl(customerId, subscriptionId) {
        const res = await call("POST", `/customers/${enc(customerId)}/portal-sessions`, { subscription_ids: [subscriptionId] });
        if (!res.ok) throw new Error(`Paddle portal oturumu açılamadı: ${res.status}`);
        const url = (await res.json())?.data?.urls?.general?.overview;
        if (typeof url !== "string" || !url.startsWith("https://")) throw new Error("Paddle portal bağlantısı dönmedi");
        return url;
      },
    },
    log: { error: console.error, warn: console.warn },
  };

  const result = await handleManage(deps, user.id, body.action);
  return json(result.body, result.status);
});
