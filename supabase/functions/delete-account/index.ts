// Planmoy — Hesap silme (güvenli akış: önce Paddle aboneliği iptal + doğrulama, sonra silme).
// Tablolar auth.users'a "on delete cascade" bağlı; silme service_role gerektirir (Edge Function).
// Paddle'da canlı abonelik iptal edilemez/doğrulanamazsa HESAP SİLİNMEZ ve başarı dönülmez. Mantık: logic.ts (testli).
// Gerekli: PADDLE_API_KEY, PADDLE_ENVIRONMENT; tablo account_deletion_log (0030), subscriptions (0029 alanları gerekmez).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { handleDelete, LIVE_STATUSES, type DeleteDeps } from "./logic.ts";

const deleteConfirmations = ["SİL", "DELETE"];
const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method !== "POST") return jsonRes({ ok: false, reason: "method-not-allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonRes({ ok: false, reason: "no-auth" }, 401);

  const { confirmation } = await req.json().catch(() => ({}));
  if (!deleteConfirmations.includes(confirmation)) return jsonRes({ ok: false, reason: "invalid-confirmation" }, 400);

  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return jsonRes({ ok: false, reason: "invalid-session" }, 401);

  const envRaw = Deno.env.get("PADDLE_ENVIRONMENT");
  const environment = envRaw === "sandbox" || envRaw === "production" ? envRaw : null;
  const apiKey = Deno.env.get("PADDLE_API_KEY") ?? "";
  const base = environment === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const call = (method: string, path: string, b?: unknown) =>
    fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: b === undefined ? undefined : JSON.stringify(b) });
  const enc = encodeURIComponent;

  const deps: DeleteDeps = {
    environment,
    hasApiKey: !!apiKey,
    async getRow(userId) {
      const { data, error } = await admin.from("subscriptions").select("paddle_subscription_id, paddle_customer_id, status").eq("user_id", userId).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    paddle: {
      async getStatus(id) {
        const res = await call("GET", `/subscriptions/${enc(id)}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Paddle abonelik okunamadı: ${res.status}`);
        return (await res.json())?.data?.status ?? null;
      },
      async liveIdsOfCustomer(customerId) {
        const res = await call("GET", `/subscriptions?customer_id=${enc(customerId)}&per_page=200`);
        if (!res.ok) throw new Error(`Paddle müşteri abonelikleri okunamadı: ${res.status}`);
        const j = await res.json();
        if (j?.meta?.pagination?.has_more) throw new Error("Paddle müşteri abonelik listesi tek sayfaya sığmadı");
        return (j?.data ?? []).filter((s: { status: string }) => LIVE_STATUSES.includes(s.status)).map((s: { id: string }) => s.id);
      },
      async cancelNow(id) {
        const res = await call("POST", `/subscriptions/${enc(id)}/cancel`, { effective_from: "immediately" });
        if (!res.ok) throw new Error(`Paddle iptal reddedildi: ${res.status} ${await res.text().catch(() => "")}`);
      },
    },
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    },
    async hash(userId) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    },
    async writeLog(e) {
      const { error } = await admin.from("account_deletion_log").insert(e);
      if (error) throw new Error(error.message);
    },
    log: { error: console.error, warn: console.warn },
  };

  const result = await handleDelete(deps, user.id);
  return jsonRes(result.body, result.status);
});
