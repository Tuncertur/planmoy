// supabase/functions/revenuecat-webhook/index.ts
//
// RevenueCat'ten gelen satın alma olaylarını (Android/iOS) dinler ve
// `subscriptions` tablosunu günceller.
//
// Kurulum sonrası RevenueCat Dashboard > Project Settings > Integrations
// > Webhooks kısmında bu fonksiyonun URL'sini ekleyin:
//   https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook
// "Authorization header value" alanına REVENUECAT_WEBHOOK_SECRET ile
// AYNI değeri yazın (rastgele uzun bir metin üretip ikisine de yapıştırın).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// ── AYARLAR ──────────────────────────────────────────────────────────
// RevenueCat Dashboard > Entitlements kısmındaki gerçek Entitlement
// Identifier'ları buraya yazın (ör. "standard", "ai_scan" gibi kendi
// belirlediğiniz isimler olabilir — Dashboard'da tanımladığınız haliyle).
const ENTITLEMENT_TO_TIER: Record<string, string> = {
  "standard": "standard",
  "ai_scan": "ai_scan",
  "family": "family",
  "company": "company",
};
// Not: "company_extra_seat" ürünü RevenueCat Dashboard'da zaten "company"
// entitlement'ına bağlanmış durumda — yani bir Firma kullanıcısı ek
// koltuk satın aldığında da bu webhook'a "company" entitlement'ı ile
// gelir, ayrı bir "extra_seat" işleme mantığına gerek yok. Kişi başı
// faturalama sayısının takibi (kaç ek koltuk alındığı) ayrı bir konu —
// kalan işler raporundaki "Firma katmanı kişi başı ek ücret" maddesi,
// backend'e bağlı, düşük öncelikli.
// ─────────────────────────────────────────────────────────────────────

const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET")!;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function upsertSubscription(
  userId: string,
  tier: string,
  status: "active" | "canceled" | "past_due",
  source: "google_play" | "app_store",
) {
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: userId,
      tier,
      status,
      source,
      updated_at: new Date().toISOString(),
    });
  if (error) console.error("Supabase upsert hatası:", error);
}

serve(async (req) => {
  const rawAuth = (req.headers.get("authorization") ?? "").trim();
  const auth = rawAuth.startsWith("Bearer ")
    ? rawAuth.slice("Bearer ".length).trim()
    : rawAuth;
  const expected = webhookSecret.trim();
  if (auth !== expected) {
    console.error(
      "Auth uyuşmadı. Gelen (JSON):",
      JSON.stringify(auth),
      "| Beklenen (JSON):",
      JSON.stringify(expected),
    );
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json();
  const event = payload.event;

  // app_user_id, RevenueCat'i başlatırken (Purchases.configure) verdiğiniz
  // ID'dir — bunun Supabase auth user_id'siyle AYNI olması gerekir. Kod
  // tarafında (app.js / RevenueCat kurulum kısmında) login sonrası
  // Purchases.logIn(supabaseUserId) çağrıldığından emin olun.
  const userId: string | undefined = event?.app_user_id;
  const entitlementIds: string[] = event?.entitlement_ids ?? [];
  const store: string = event?.store ?? "";
  const eventType: string = event?.type ?? "";

  if (!userId) {
    console.error("app_user_id bulunamadı", payload);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const source = store === "PLAY_STORE" ? "google_play" : "app_store";

  try {
    switch (eventType) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE":
      case "UNCANCELLATION": {
        const tier = entitlementIds
          .map((id) => ENTITLEMENT_TO_TIER[id])
          .find(Boolean);
        if (tier) {
          await upsertSubscription(userId, tier, "active", source);
        } else {
          console.error("Bilinmeyen entitlement", entitlementIds);
        }
        break;
      }

      case "CANCELLATION":
      case "EXPIRATION": {
        await upsertSubscription(userId, "free", "canceled", source);
        break;
      }

      case "BILLING_ISSUE": {
        const tier = entitlementIds
          .map((id) => ENTITLEMENT_TO_TIER[id])
          .find(Boolean) ?? "free";
        await upsertSubscription(userId, tier, "past_due", source);
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("Webhook işleme hatası:", err);
    return new Response("Internal error", { status: 500 });
  }
});
