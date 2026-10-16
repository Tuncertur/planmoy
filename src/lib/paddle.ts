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
const ENVIRONMENT = (import.meta.env.VITE_PADDLE_ENVIRONMENT as string | undefined) ?? "production";

export function isPaddleConfigured(): boolean {
  return Boolean(CLIENT_TOKEN);
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
// ve `changed: true` döner (yeni plan webhook ile birkaç saniye içinde yansır).
export async function openPaddleCheckout(
  plan: "personal" | "solo" | "studio",
): Promise<{ ok: boolean; reason?: string; changed?: boolean; direction?: "upgrade" | "downgrade" }> {
  if (!CLIENT_TOKEN) return { ok: false, reason: "not-configured" };
  const { data, error } = await supabase.functions.invoke("create-checkout", { body: { plan } });
  if (error || !data?.ok) return { ok: false, reason: data?.reason ?? "server-error" };
  if (data.changed) return { ok: true, changed: true, direction: data.direction };
  try {
    await loadPaddleScript();
  } catch {
    return { ok: false, reason: "script-load-failed" };
  }
  window.Paddle!.Checkout.open({ transactionId: data.transactionId });
  return { ok: true };
}
