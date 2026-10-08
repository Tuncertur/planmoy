// Planmoy — Paddle.js checkout entegrasyonu (F-01 düzeltmesi).
//
// ÖNEMLİ SINIR (dürüstçe not edilmiştir): Paddle Billing'in istemci-taraflı
// overlay checkout modeli, `customData`'yı istemci tarafında ayarlamayı
// gerektirir — bu Paddle'ın kendi dokümante ettiği standart akıştır, burada
// atlanamaz. Bunu güvenli hale getiren asıl katman sunucu tarafındadır:
// `paddle-webhook`, gelen `custom_data.supabase_user_id`'nin GERÇEKTEN var
// olan bir Supabase kullanıcısına ait olduğunu `auth.admin.getUserById` ile
// doğrular ve sadece imzası geçerli, Paddle'dan gelen webhook isteklerine
// göre durum günceller — istemci hiçbir zaman doğrudan `subscriptions`
// tablosuna yazamaz (RLS: sadece service_role yazar, bkz. 0012 migration).
//
// Fiyat ID'leri (`pri_...`) kasıtlı olarak UYDURULMADI — ortam
// değişkenlerinden okunur. Doldurulmadıkları sürece ilgili plan butonu
// "yakında" durumunda kalır, sahte/placeholder bir ID ile checkout açmaz.

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

export const PADDLE_PRICE_IDS: Record<"personal" | "solo" | "studio", string | undefined> = {
  personal: import.meta.env.VITE_PADDLE_PRICE_PERSONAL as string | undefined,
  solo: import.meta.env.VITE_PADDLE_PRICE_SOLO as string | undefined,
  studio: import.meta.env.VITE_PADDLE_PRICE_STUDIO as string | undefined,
};

export function isPaddleConfigured(): boolean {
  return Boolean(CLIENT_TOKEN);
}

export function isPlanPurchasable(plan: "personal" | "solo" | "studio"): boolean {
  return Boolean(CLIENT_TOKEN && PADDLE_PRICE_IDS[plan]);
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

// Checkout açar. `userId` ve `email` oturumdan (auth.uid()) gelir — istemci
// kodu bunları her zaman GERÇEK oturumdan okur, elle değiştirilebilir bir
// form alanından değil. Webhook tarafı bunu tekrar doğrular (bkz. yukarıdaki not).
export async function openPaddleCheckout(params: {
  plan: "personal" | "solo" | "studio";
  userId: string;
  email: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const priceId = PADDLE_PRICE_IDS[params.plan];
  if (!CLIENT_TOKEN || !priceId) {
    return { ok: false, reason: "not-configured" };
  }
  try {
    await loadPaddleScript();
  } catch {
    return { ok: false, reason: "script-load-failed" };
  }
  window.Paddle!.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: { email: params.email },
    customData: {
      supabase_user_id: params.userId,
      tier: params.plan,
    },
  });
  return { ok: true };
}
