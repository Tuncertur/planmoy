// Planmoy — Paddle.js checkout entegrasyonu (F-01 düzeltmesi).
//
// GÜVENLİK: kullanıcı kimliği ve fiyat istemciden alınmaz. Checkout, sunucuda
// (`create-checkout` Edge Function) JWT doğrulanarak oluşturulan bir Paddle
// transaction'ı üzerinden açılır; abonelik durumunu yalnızca imzası doğrulanmış
// `paddle-webhook` yazar (istemci `subscriptions` tablosuna yazamaz, bkz. 0012).
//
// Fiyat ID'leri (`pri_...`) UYDURULMADI ve istemcide yoktur; sunucu secret'larından
// (PADDLE_PRICE_*) okunur. Tanımlı değilse "not-configured" döner, checkout açılmaz.

import { supabase } from "./supabase";

declare global {
  interface Window {
    Paddle?: {
      Initialize: (opts: { token: string; eventCallback?: (event: any) => void }) => void;
      Environment: { set: (env: "sandbox" | "production") => void };
      Checkout: { open: (opts: any) => void };
    };
  }
}

const CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined;
// Ortam YALNIZ token önekinden türetilir (test_ = sandbox, live_ = production). Ayrı bir "varsayılan production"
// yoktur: önek tanınmıyorsa ortam belirsizdir ve checkout açılmaz. VITE_PADDLE_ENVIRONMENT yalnız tutarlılık denetimidir.
function envFromToken(token: string | undefined): "sandbox" | "production" | null {
  if (token?.startsWith("test_")) return "sandbox";
  if (token?.startsWith("live_")) return "production";
  return null;
}
const ENVIRONMENT = envFromToken(CLIENT_TOKEN);
const DECLARED_ENV = import.meta.env.VITE_PADDLE_ENVIRONMENT as string | undefined;
const ENV_CONSISTENT = ENVIRONMENT !== null && (DECLARED_ENV === undefined || DECLARED_ENV === "" || DECLARED_ENV === ENVIRONMENT);

// Mağaza uygulamasında (iOS/Android Capacitor) dijital abonelik satışı Paddle ile YAPILMAZ: Apple IAP / Google Play Billing
// kuralları ayrıca çözülene kadar yerel uygulamada satın alma akışı kapalıdır (web'de açık).
export function isNativeApp(): boolean {
  try {
    return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function isPaddleConfigured(): boolean {
  return Boolean(CLIENT_TOKEN) && ENV_CONSISTENT;
}

let loadPromise: Promise<void> | null = null;

function loadPaddleScript(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (window.Paddle) return resolve();
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      if (!window.Paddle || !CLIENT_TOKEN) return reject(new Error("Paddle.js yüklenemedi veya token eksik"));
      if (ENVIRONMENT === "sandbox") window.Paddle.Environment.set("sandbox");
      window.Paddle.Initialize({ token: CLIENT_TOKEN });
      resolve();
    };
    script.onerror = () => reject(new Error("Paddle.js script yüklenemedi"));
    document.head.appendChild(script);
  });
  return loadPromise;
}

// Checkout açar. Kullanıcı kimliği ve fiyat ID'si İSTEMCİDEN GELMEZ: istemci yalnızca
// plan adını gönderir, `create-checkout` Edge Function'ı JWT'den kullanıcıyı doğrular,
// fiyatı sunucu secret'larından okur, custom_data'yı sunucuda yazar ve transactionId döner.
// Aktif aboneliği olan kullanıcıda checkout AÇILMAZ: sunucu planı mevcut abonelik üzerinden değiştirir
// ve `changed: true` döner (yeni plan webhook ile birkaç saniye içinde yansır). Düşürme dönem sonuna ZAMANLANIR (`scheduled`).
export async function openPaddleCheckout(
  plan: "personal" | "solo" | "studio",
): Promise<{
  ok: boolean; reason?: string; changed?: boolean; direction?: "upgrade" | "downgrade";
  scheduled?: boolean; effectiveAt?: string; pendingCleared?: boolean;
}> {
  if (isNativeApp()) return { ok: false, reason: "store-billing-required" };
  if (!CLIENT_TOKEN) return { ok: false, reason: "not-configured" };
  if (!ENV_CONSISTENT) return { ok: false, reason: "environment-mismatch" };
  const { data, error } = await supabase.functions.invoke("create-checkout", { body: { plan } });
  if (error || !data?.ok) return { ok: false, reason: data?.reason ?? "server-error" };
  // Sunucu (Paddle API) ortamı ile tarayıcı (Paddle.js) ortamı AYNI olmalı; farklıysa ya da sunucu bildirmiyorsa
  // (eski sürüm) hiçbir işlem yapılmaz — gerçek/sandbox karışımı ödeme asla başlamaz.
  if (data.environment !== ENVIRONMENT) return { ok: false, reason: data.environment ? "environment-mismatch" : "environment-unknown" };
  if (data.changed) return { ok: true, changed: true, direction: data.direction };
  if (data.scheduled) return { ok: true, scheduled: true, direction: data.direction, effectiveAt: data.effectiveAt };
  if (data.pendingCleared) return { ok: true, pendingCleared: true };
  try {
    await loadPaddleScript();
  } catch {
    return { ok: false, reason: "script-load-failed" };
  }
  window.Paddle!.Checkout.open({ transactionId: data.transactionId });
  return { ok: true };
}
