// Planmoy — Paddle ile ilgili PAYLAŞILAN saf mantık (webhook, reconcile, checkout kullanır).
// Dış import YOK; Node `node:test` ile test edilir (bkz. paddle-webhook/logic.test.ts).

export type PaidTier = "personal" | "solo" | "studio";
export type Tier = "free" | PaidTier;
export type SubStatus = "active" | "canceled" | "past_due" | "paused";

export const PRICE_ENV_BY_TIER: Record<PaidTier, string> = {
  personal: "PADDLE_PRICE_PERSONAL",
  solo: "PADDLE_PRICE_SOLO",
  studio: "PADDLE_PRICE_STUDIO",
};

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Fiyat -> plan eşlemesi
// ---------------------------------------------------------------------------
export function buildPriceTierMap(getEnv: (name: string) => string | undefined): Record<string, PaidTier> {
  const map: Record<string, PaidTier> = {};
  for (const tier of Object.keys(PRICE_ENV_BY_TIER) as PaidTier[]) {
    const priceId = getEnv(PRICE_ENV_BY_TIER[tier]);
    if (!priceId) continue;
    if (map[priceId]) throw new Error(`Aynı fiyat kimliği iki plana atanmış (${map[priceId]} ve ${tier})`);
    map[priceId] = tier;
  }
  return map;
}

export function extractPriceIds(data: any): string[] {
  const ids = new Set<string>();
  for (const item of Array.isArray(data?.items) ? data.items : []) {
    const id = item?.price?.id ?? item?.price_id;
    if (typeof id === "string") ids.add(id);
  }
  // transaction.completed: details.line_items[].price_id yedek yol
  for (const li of Array.isArray(data?.details?.line_items) ? data.details.line_items : []) {
    if (typeof li?.price_id === "string") ids.add(li.price_id);
  }
  return [...ids];
}

export type TierResult =
  | { kind: "tier"; tier: PaidTier }
  | { kind: "unknown" } // fiyat yok ya da haritada değil
  | { kind: "ambiguous" }; // birden fazla farklı plan fiyatı

export function tierFromData(data: any, priceTier: Record<string, PaidTier>): TierResult {
  const tiers = new Set<PaidTier>();
  for (const id of extractPriceIds(data)) {
    const t = priceTier[id];
    if (t) tiers.add(t);
  }
  if (tiers.size === 0) return { kind: "unknown" };
  if (tiers.size > 1) return { kind: "ambiguous" };
  return { kind: "tier", tier: [...tiers][0] };
}

// ---------------------------------------------------------------------------
// Durum eşlemesi (Paddle -> subscriptions.status check kısıtı)
// ---------------------------------------------------------------------------
export function mapStatus(paddleStatus: string | undefined): { status: SubStatus; known: boolean } {
  switch (paddleStatus) {
    case "active":
    case "trialing":
      return { status: "active", known: true };
    case "canceled":
      return { status: "canceled", known: true };
    case "paused":
      return { status: "paused", known: true };
    case "past_due":
      return { status: "past_due", known: true };
    default:
      return { status: "past_due", known: false }; // bilinmeyen durumda erişimi verme
  }
}

// Bazı subscription.* olaylarında status eksikse olay adından türet.
export const STATUS_BY_EVENT: Record<string, string> = {
  "subscription.activated": "active",
  "subscription.resumed": "active",
  "subscription.trialing": "trialing",
  "subscription.past_due": "past_due",
  "subscription.paused": "paused",
  "subscription.canceled": "canceled",
};

// Plan değişikliği modları (Paddle proration_billing_mode)
export const UPGRADE_MODE = "prorated_immediately"; // hemen orantılı tahsilat
// Dönem sonu düşürme: yenilemeden ÖNCE uygulanırsa ücret alınmaz (yenileme düşük fiyattan kesilir);
// yenileme geçtiyse düşük plana geçilir ve orantılı kredi bir sonraki yenilemeye yansır.
export const DOWNGRADE_MODE_BEFORE_RENEWAL = "do_not_bill";
export const DOWNGRADE_MODE_AFTER_RENEWAL = "prorated_next_billing_period";

// ---------------------------------------------------------------------------
// Sandbox izolasyonu: sandbox, CANLI Supabase projesiyle paylaşılırken yalnızca izinli test kullanıcıları ödeme yapabilir.
// SANDBOX_TEST_USER_IDS = virgülle ayrılmış kullanıcı UUID'leri. Ortam belirsiz/boş liste => reddet (fail-closed).
// production ortamında liste uygulanmaz (gerçek müşteriler).
// ---------------------------------------------------------------------------
export function parseUserAllowlist(raw: string | undefined | null): Set<string> {
  return new Set((raw ?? "").split(",").map((x) => x.trim().toLowerCase()).filter((x) => UUID_RE.test(x)));
}
export function userAllowedFor(environment: "sandbox" | "production" | null, allow: Set<string>, userId: string): boolean {
  if (environment === "production") return true;
  if (environment === "sandbox") return allow.has(userId.toLowerCase());
  return false;
}
