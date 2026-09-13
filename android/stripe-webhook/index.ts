// supabase/functions/stripe-webhook/index.ts
//
// Stripe'tan gelen ödeme olaylarını dinler ve `subscriptions` tablosunu
// GÜVENLİ şekilde (service role ile, istemciden bağımsız) günceller.
//
// Kurulum sonrası Stripe Dashboard > Developers > Webhooks kısmında
// bu fonksiyonun URL'sini endpoint olarak eklemeniz gerekir:
//   https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.4.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// ── AYARLAR ──────────────────────────────────────────────────────────
// Stripe Dashboard'da her bir Payment Link/Price için oluşturduğunuz
// gerçek Price ID'leri buraya yazın (Dashboard > Product catalog > ilgili
// ürüne tıklayın > "API ID" alanı, "price_..." ile başlar).
const PRICE_TO_TIER: Record<string, string> = {
  "price_1UB8Y4BaypFaBV9ZnjVNIGd2": "standard",   // Standart Plan $0.99
  "price_1UB8YcBaypFaBV9Z4eqc5KZ3": "ai_scan",     // AI Fiş Tarama Planı $1.30
  "price_1UB8ZFBaypFaBV9Z3TQujO95": "family",      // Aile Planı $1.99
  "price_1UB8ZhBaypFaBV9Zo3M2JRJu": "company",     // Firma Planı $49.99
};
// Not: "Ek Kişi (Firma)" (price_1UB8aIBaypFaBV9ZTgNeEbPD, $2.99) ayrı bir
// kalem — bu, bir Firma aboneliğine ek koltuk eklendiğinde kullanılacak,
// ana tier belirleme mantığına dahil değil. Firma faturalama mantığı
// (kişi başı ek ücret) backend'e bağlı, kalan işler raporundaki ayrı bir
// madde (henüz başlanmadı).
// ─────────────────────────────────────────────────────────────────────

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-11-20.acacia",
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function upsertSubscription(
  userId: string,
  tier: string,
  status: "active" | "canceled" | "past_due" | "trialing",
) {
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: userId,
      tier,
      status,
      source: "stripe",
      updated_at: new Date().toISOString(),
    });
  if (error) console.error("Supabase upsert hatası:", error);
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret,
    );
  } catch (err) {
    console.error("İmza doğrulama hatası:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // client_reference_id'ye Checkout Session oluşturulurken Supabase
        // user_id'sini koymanız gerekiyor (web ödeme akışında zaten
        // yapıldığını PDF'ten biliyoruz — Checkout Session ID doğrulaması
        // geçişinde bu alan set ediliyor olmalı, kontrol edin).
        const userId = session.client_reference_id;
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id,
        );
        const priceId = lineItems.data[0]?.price?.id;
        const tier = priceId ? PRICE_TO_TIER[priceId] : undefined;

        if (userId && tier) {
          await upsertSubscription(userId, tier, "active");
        } else {
          console.error("userId veya tier bulunamadı", { userId, priceId });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        const priceId = sub.items.data[0]?.price?.id;
        const tier = priceId ? PRICE_TO_TIER[priceId] : undefined;
        if (userId && tier) {
          const status = sub.status === "active" ? "active" : "past_due";
          await upsertSubscription(userId, tier, status);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await upsertSubscription(userId, "free", "canceled");
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
