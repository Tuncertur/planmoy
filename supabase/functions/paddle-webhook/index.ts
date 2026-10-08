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

// DÜZELTME (QA denetimi): bu fonksiyon "tier"/"source"/"provider_subscription_id"
// sütunlarına yazıyordu ama gerçek şemada (0012_subscriptions.sql) bunlar yok —
// tablo "plan" ve "paddle_subscription_id" kullanıyor. Eşleşmeyince her upsert
// veritabanı hatasıyla SESSİZCE başarısız oluyordu (sadece console.error, 200
// dönülüyordu) — yani ödeme alınıp plan hiç aktifleşmeyebilirdi.
// DÜZELTME (2. QA denetimi, F-04 — HIGH): occurredAt eklendi. Mevcut satırın
// last_event_at'i, gelen olayın occurredAt'inden daha YENİyse yazma —
// böylece ağ/retry kaynaklı sıra-dışı teslim edilen eski bir olay (örn. geç
// gelen bir "subscription.updated: active"), daha yeni bir
// "subscription.canceled"ın üzerine yazamaz.
const VALID_TIERS = new Set(["free", "personal", "solo", "studio"]);

// DÜZELTME (2. QA denetimi, F-01 — CRITICAL'in sunucu tarafı güvencesi):
// customData, Paddle'ın istemci-taraflı checkout modelinde kaçınılmaz olarak
// istemciden geliyor (PricingScreen → openPaddleCheckout → Paddle overlay).
// Bunu güvenli hale getiren katman burası: webhook, custom_data'daki
// supabase_user_id'nin GERÇEKTEN var olan bir Supabase kullanıcısına ait
// olduğunu doğrulamadan hiçbir yazma yapmaz — rastgele/bozuk bir id ile
// subscriptions tablosuna çöp satır yazılamaz. (Not: bu, "bir kullanıcının
// kendi hesabına girip, kendi kartıyla ödeyip custom_data'ya BAŞKA birinin
// id'sini yazması" senaryosunu önlemez — bu, Paddle Billing'in istemci
// taraflı overlay modelinin bilinen bir sınırıdır; tam önlem için Paddle'ın
// sunucu-taraflı "Transaction" API'siyle checkout'u sunucuda başlatmak
// gerekir, bu ayrı bir mimari değişikliktir ve bu turun kapsamı dışıdır.)
async function userExists(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  return !error && !!data?.user;
}

async function upsertSubscription(
  userId: string,
  plan: "free" | "personal" | "solo" | "studio",
  status: "active" | "canceled" | "past_due" | "paused",
  occurredAt: string,
  paddleSubscriptionId?: string,
  paddleCustomerId?: string,
) {
  if (!VALID_TIERS.has(plan)) {
    console.error("Geçersiz tier, yoksayıldı:", { userId, plan });
    return new Error("invalid-tier");
  }
  if (!(await userExists(userId))) {
    console.error("custom_data.supabase_user_id gerçek bir kullanıcıya ait değil, yoksayıldı:", { userId });
    return new Error("unknown-user");
  }

  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("last_event_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.last_event_at && new Date(existing.last_event_at) > new Date(occurredAt)) {
    console.warn("Sıra dışı (eski) webhook olayı yoksayıldı:", { userId, occurredAt, existing: existing.last_event_at });
    return null;
  }

  const row: Record<string, unknown> = {
    user_id: userId,
    plan,
    status,
    last_event_at: occurredAt,
    updated_at: new Date().toISOString(),
  };
  if (paddleSubscriptionId) row.paddle_subscription_id = paddleSubscriptionId;
  if (paddleCustomerId) row.paddle_customer_id = paddleCustomerId;
  const { error } = await supabaseAdmin.from("subscriptions").upsert(row);
  if (error) console.error("Supabase upsert hatası:", error);
  return error;
}

// DÜZELTME (F-04): aynı event.id ikinci kez işlenmesin (Paddle "en az bir
// kez" teslim eder, retry'lar aynı event'i tekrar gönderebilir).
async function alreadyProcessed(eventId: string | undefined, eventType: string): Promise<boolean> {
  if (!eventId) return false; // id yoksa dedup edemeyiz, normal akışa devam
  const { error } = await supabaseAdmin.from("processed_webhook_events").insert({ event_id: eventId, event_type: eventType });
  // insert çakışması (primary key ihlali) = bu event zaten işlenmiş
  return !!error;
}

// DÜZELTME (F-04): yakalanmış geçerli bir imzalı istek süresiz tekrar
// oynatılamasın — ts, şimdiki zamana göre 5 dakikadan eskiyse reddet.
function isFreshTimestamp(tsSeconds: string): boolean {
  const tsMs = Number(tsSeconds) * 1000;
  if (!Number.isFinite(tsMs)) return false;
  return Math.abs(Date.now() - tsMs) <= 5 * 60 * 1000;
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

  if (!isFreshTimestamp(ts)) return false; // F-04: eski/yakalanmış istekleri reddet (replay koruması)

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
    const eventId: string | undefined = event.event_id ?? event.id;
    const occurredAt: string = event.occurred_at ?? new Date().toISOString();
    const data = event.data || {};
    const customData = data.custom_data || {};
    const userId: string | undefined = customData.supabase_user_id;
    const tier: string | undefined = customData.tier;

    // F-04: idempotency — aynı event.id ikinci kez gelirse (Paddle retry)
    // sessizce 200 dön, tekrar işleme.
    if (await alreadyProcessed(eventId, eventType)) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    switch (eventType) {
      case "transaction.completed":
      case "subscription.created": {
        if (userId && tier) {
          const subId = data.subscription_id || data.id; // transaction'da subscription_id, subscription olayında id
          await upsertSubscription(userId, tier, "active", occurredAt, subId);
        } else {
          console.error("userId veya tier bulunamadı (custom_data eksik)", { userId, tier, eventType });
        }
        break;
      }

      case "subscription.updated": {
        if (userId && tier) {
          const status = data.status === "active" ? "active" : "past_due";
          await upsertSubscription(userId, tier, status, occurredAt, data.id);
        }
        break;
      }

      case "subscription.canceled": {
        if (userId) {
          await upsertSubscription(userId, "free", "canceled", occurredAt, data.id);
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
