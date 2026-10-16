// Planmoy — Abonelik mutabakatı (Paddle <-> subscriptions). Karar mantığı: logic.ts (testli).
// ÇAĞIRAN: yalnızca service-role anahtarını taşıyan istek (cron/ops iş akışı). Kullanıcı JWT'si KABUL EDİLMEZ.
// Gövde: {"mode":"report"|"repair"|"apply-downgrades"}; varsayılan "report" (salt-okuma).
// Yazan modlar ayrıca sunucu secret'ı ile AÇILMALIDIR (varsayılan KAPALI):
//   RECONCILE_REPAIR_ENABLED=true, RECONCILE_APPLY_DOWNGRADES_ENABLED=true
// Diğer secrets: PADDLE_API_KEY, PADDLE_ENVIRONMENT, PADDLE_PRICE_PERSONAL/SOLO/STUDIO. Tablo: subscription_repairs (0028), subscriptions.pending_plan* (0029).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildPriceTierMap, PRICE_ENV_BY_TIER, type PaidTier } from "../_shared/paddle-core.ts";
import { reconcile, type DbRow, type Options, type ReconcileDeps } from "./logic.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const MODES = ["report", "repair", "apply-downgrades"];

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, reason: "method-not-allowed" }, 405);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const given = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  if (!serviceKey || !safeEqual(given, serviceKey)) return json({ ok: false, reason: "forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const mode = body.mode ?? "report";
  if (!MODES.includes(mode)) return json({ ok: false, reason: "invalid-mode" }, 400);

  const envRaw = Deno.env.get("PADDLE_ENVIRONMENT");
  const environment = envRaw === "sandbox" || envRaw === "production" ? envRaw : null;
  const apiKey = Deno.env.get("PADDLE_API_KEY") ?? "";
  if (!environment || !apiKey) return json({ ok: false, reason: "not-configured" }, 503); // fail-closed
  const base = environment === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  let priceTier: Record<string, PaidTier>;
  try { priceTier = buildPriceTierMap((n) => Deno.env.get(n)); } catch (e) { return json({ ok: false, reason: "price-config-invalid", detail: String(e) }, 503); }
  if (Object.keys(priceTier).length === 0) return json({ ok: false, reason: "not-configured" }, 503);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const call = (method: string, pathOrUrl: string, b?: unknown) =>
    fetch(pathOrUrl.startsWith("http") ? pathOrUrl : `${base}${pathOrUrl}`, { method, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: b === undefined ? undefined : JSON.stringify(b) });
  const enc = encodeURIComponent;

  const deps: ReconcileDeps = {
    now: () => Date.now(),
    priceTier,
    flags: { repair: Deno.env.get("RECONCILE_REPAIR_ENABLED") === "true", applyDowngrades: Deno.env.get("RECONCILE_APPLY_DOWNGRADES_ENABLED") === "true" },
    async listPaddle() {
      const all: unknown[] = [];
      let url: string = "/subscriptions?per_page=200";
      for (let page = 0; page < 25; page++) {
        const res = await call("GET", url);
        if (!res.ok) throw new Error(`Paddle abonelik listesi okunamadı: ${res.status}`);
        const j = await res.json();
        all.push(...(j?.data ?? []));
        if (!j?.meta?.pagination?.has_more) return all;
        const next = j.meta.pagination.next;
        if (typeof next !== "string" || !next.startsWith(base)) throw new Error("Paddle sayfalama bağlantısı geçersiz");
        url = next;
      }
      throw new Error("Paddle listesi 25 sayfayı aştı; eksik veriyle mutabakat yapılmaz");
    },
    async listRows() {
      const { data, error } = await admin.from("subscriptions").select("user_id, plan, status, paddle_subscription_id, last_event_at, pending_plan, pending_plan_at").limit(100000);
      if (error) throw new Error(`subscriptions okunamadı: ${error.message}`);
      return (data ?? []) as DbRow[];
    },
    async repairCanceled(r) {
      let q = admin.from("subscriptions").update({ plan: "free", status: "canceled", pending_plan: null, pending_plan_at: null, updated_at: new Date().toISOString() })
        .eq("user_id", r.user_id).eq("paddle_subscription_id", r.paddle_subscription_id!).eq("plan", r.plan).eq("status", r.status);
      q = r.last_event_at ? q.eq("last_event_at", r.last_event_at) : q.is("last_event_at", null);
      const { data, error } = await q.select("user_id");
      if (error) throw new Error(`onarım yazılamadı: ${error.message}`);
      return data?.length ?? 0;
    },
    priceIdFor: (plan) => Deno.env.get(PRICE_ENV_BY_TIER[plan]),
    async getLive(subId) {
      const res = await call("GET", `/subscriptions/${enc(subId)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Paddle abonelik okunamadı: ${res.status}`);
      const d = (await res.json())?.data;
      if (!d) return null;
      return { status: d.status, scheduled_change: d.scheduled_change ?? null, price_ids: (d.items ?? []).map((i: { price?: { id?: string } }) => i.price?.id).filter(Boolean), period_end: d.current_billing_period?.ends_at ?? null };
    },
    async changePlan(subId, priceId, mode) {
      const res = await call("PATCH", `/subscriptions/${enc(subId)}`, { items: [{ price_id: priceId, quantity: 1 }], proration_billing_mode: mode });
      if (!res.ok) throw new Error(`Paddle düşürme reddedildi: ${res.status} ${await res.text().catch(() => "")}`);
    },
    async clearPendingIf(userId, expected) {
      const { data, error } = await admin.from("subscriptions").update({ pending_plan: null, pending_plan_at: null }).eq("user_id", userId).eq("pending_plan", expected).select("user_id");
      if (error) throw new Error(error.message);
      return data?.length ?? 0;
    },
    async audit(e) {
      const { error } = await admin.from("subscription_repairs").insert({ ...e, migration: "reconcile-subscriptions" });
      if (error) throw new Error(`denetim kaydı yazılamadı: ${error.message}`);
    },
    log: { error: console.error, warn: console.warn },
  };

  const report = await reconcile(deps, { mode } as Options);
  return json(report, report.ok ? 200 : report.reason === "mode-disabled" ? 403 : 502);
});
