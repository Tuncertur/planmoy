// supabase/functions/paddle-webhook/index.ts
//
// Paddle'dan gelen ödeme olaylarını dinler ve `subscriptions` tablosunu
// GÜVENLİ şekilde (service role ile) günceller.
//
// Kurulum sonrası Paddle Dashboard > Developer Tools > Notifications
// kısmında bu fonksiyonun URL'sini bir "Notification destination" olarak
// eklemeniz gerekir:
//   https://<PROJECT_REF>.supabase.co/functions/v1/paddle-webhook
// Oradan alacağınız "Signing secret"i PADDLE_WEBHOOK_SECRET olarak
// Supabase secrets'a kaydedin.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const webhookSecret = Deno.env.get("PADDLE_WEBHOOK_SECRET")!;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function upsertSubscription(
  userId: string,
  tier: string,
  status: "active" | "canceled" | "past_due" | "trialing",
  providerSubscriptionId?: string,
) {
  const row: Record<string, unknown> = {
    user_id: userId,
    tier,
    status,
    source: "paddle",
    updated_at: new Date().toISOString(),
  };
  if (providerSubscriptionId) row.provider_subscription_id = providerSubscriptionId;
  const { error } = await supabaseAdmin.from("subscriptions").upsert(row);
  if (error) console.error("Supabase upsert hatası:", error);
}

async function verifySignature(rawBody: string, header: string | null): Promise<boolean> {
  if (!header) return false;
  // Paddle-Signature başlığı: "ts=1234567890;h1=abcdef..."
  const parts = Object.fromEntries(
    header.split(";").map((p) => p.split("=") as [string, string]),
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload),
  );
  const computedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Sabit zamanlı karşılaştırma (basit === yerine) — zamanlama tabanlı
  // yan kanal saldırılarına karşı ek bir önlem.
  if (computedHex.length !== h1.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ h1.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get("Paddle-Signature");

  const valid = await verifySignature(rawBody, signature);
  if (!valid) {
    console.error("Geçersiz Paddle imzası");
    return new Response("Invalid signature", { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    const eventType = event.event_type;
    const data = event.data || {};
    const customData = data.custom_data || {};
    const userId: string | undefined = customData.supabase_user_id;
    const tier: string | undefined = customData.tier;

    switch (eventType) {
      case "transaction.completed":
      case "subscription.created": {
        if (userId && tier) {
          const subId = data.subscription_id || data.id; // transaction'da subscription_id, subscription olayında id
          await upsertSubscription(userId, tier, "active", subId);
        } else {
          console.error("userId veya tier bulunamadı (custom_data eksik)", { userId, tier, eventType });
        }
        break;
      }

      case "subscription.updated": {
        if (userId && tier) {
          const status = data.status === "active" ? "active" : "past_due";
          await upsertSubscription(userId, tier, status, data.id);
        }
        break;
      }

      case "subscription.canceled": {
        if (userId) {
          await upsertSubscription(userId, "free", "canceled", data.id);
        }
        break;
      }

      default:
        // Diğer olayları şimdilik yoksayıyoruz.
        break;
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("Webhook işleme hatası:", err);
    return new Response("Internal error", { status: 500 });
  }
});
