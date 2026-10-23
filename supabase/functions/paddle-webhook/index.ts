// supabase/functions/paddle-webhook/index.ts
//
// Paddle'dan gelen ödeme olaylarını dinler ve `subscriptions` tablosunu
// GÜVENLİ şekilde (service role ile) günceller. Karar mantığı ve imza doğrulaması
// `logic.ts` içindedir (otomatik testli); bu dosya yalnızca ortamı bağlar.
//
// Kurulum: Paddle > Developer tools > Notifications'a şu URL'yi "notification destination"
// olarak ekleyin: https://<PROJECT_REF>.supabase.co/functions/v1/paddle-webhook
// Oradaki "signing secret" PADDLE_WEBHOOK_SECRET olarak Supabase secrets'a yazılır.
//
// Sandbox/canlı ayrımı: her ortamın kendi destination'ı ve imza secret'ı vardır; yanlış ortamın
// olayı imza doğrulamasında reddedilir. Plan, PADDLE_PRICE_* secret'larıyla eşlenir.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  buildPriceTierMap, claimResultFromRpc, parseUserAllowlist, userAllowedFor, handleEvent, UNIQUE_VIOLATION, userExistsFromAuthResult, verifySignature,
  type Deps, type ExistingRow, type WriteRow,
} from "./logic.ts";

const webhookSecret = Deno.env.get("PADDLE_WEBHOOK_SECRET");

const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function makeDeps(): Deps {
  return {
    priceTier: buildPriceTierMap((n) => Deno.env.get(n)),
    now: () => new Date().toISOString(),
    log: { info: console.log, warn: console.warn, error: console.error },

    async claimEvent(eventId, eventType) {
      const { data, error } = await supabaseAdmin.rpc("claim_webhook_event", { p_event_id: eventId, p_event_type: eventType });
      return claimResultFromRpc(data, error);
    },

    async completeEvent(eventId) {
      const { error } = await supabaseAdmin.rpc("complete_webhook_event", { p_event_id: eventId });
      if (error) throw new Error(`olay tamamlanamadı: ${error.message}`);
    },

    async releaseEvent(eventId) {
      const { error } = await supabaseAdmin.rpc("release_webhook_event", { p_event_id: eventId });
      if (error) throw new Error(`kira bırakılamadı: ${error.message}`);
    },

    async userExists(userId) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      return userExistsFromAuthResult(data, error as { status?: number; code?: string } | null);
    },

    userAllowed(userId) {
      const e = Deno.env.get("PADDLE_ENVIRONMENT");
      return userAllowedFor(e === "sandbox" || e === "production" ? e : null, parseUserAllowlist(Deno.env.get("SANDBOX_TEST_USER_IDS")), userId);
    },

    async findUserBySubscription(subscriptionId) {
      const { data, error } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id")
        .eq("paddle_subscription_id", subscriptionId)
        .maybeSingle();
      if (error) throw new Error(`abonelik araması hatası: ${error.message}`);
      return data?.user_id ?? null;
    },

    async getSubscription(userId) {
      const { data, error } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, status, paddle_subscription_id, paddle_customer_id, last_event_at, past_due_since, pending_plan, pending_plan_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(`abonelik okuma hatası: ${error.message}`);
      return (data as ExistingRow | null) ?? null;
    },

    // Compare-and-set: okunan last_event_at hâlâ aynıysa yaz; yoksa "conflict" (500 -> Paddle yeniden dener).
    async writeSubscription(userId, expected: ExistingRow | null, row: WriteRow) {
      if (!expected) {
        const { error } = await supabaseAdmin.from("subscriptions").insert(row);
        if (!error) return "ok";
        if (error.code === UNIQUE_VIOLATION) return "conflict";
        throw new Error(`abonelik insert hatası: ${error.code ?? ""} ${error.message}`);
      }
      let q = supabaseAdmin.from("subscriptions").update(row).eq("user_id", userId);
      q = expected.last_event_at ? q.eq("last_event_at", expected.last_event_at) : q.is("last_event_at", null);
      const { data, error } = await q.select("user_id");
      if (error) throw new Error(`abonelik update hatası: ${error.code ?? ""} ${error.message}`);
      return data && data.length > 0 ? "ok" : "conflict";
    },
  };
}

serve(async (req) => {
  if (!webhookSecret) {
    console.error("PADDLE_WEBHOOK_SECRET tanımlı değil — olaylar işlenmiyor");
    return new Response("Not configured", { status: 500 }); // 2xx dönme: Paddle yeniden denesin
  }

  const rawBody = await req.text(); // imza için HAM gövde
  const valid = await verifySignature(rawBody, req.headers.get("Paddle-Signature"), webhookSecret, Date.now());
  if (!valid) {
    console.error("Geçersiz Paddle imzası");
    return new Response("Invalid signature", { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  let deps: Deps;
  try {
    deps = makeDeps();
  } catch (err) {
    console.error("Yapılandırma hatası:", err instanceof Error ? err.message : err);
    return new Response("Misconfigured", { status: 500 });
  }

  const result = await handleEvent(deps, event);
  return new Response(JSON.stringify(result.body), { status: result.status, headers: { "Content-Type": "application/json" } });
});
