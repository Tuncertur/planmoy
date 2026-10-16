// Planmoy — create-checkout karar mantığı (dış import YOK; Node `node:test` ile test edilir).
//
// Amaç: aynı kullanıcıya İKİNCİ bağımsız abonelik açılmasını engellemek.
//  - Mevcut abonelik varsa yeni checkout AÇILMAZ: yükseltme/düşürme mevcut Paddle aboneliği üzerinden
//    (PATCH /subscriptions/{id}) yapılır; sonucu webhook DB'ye yansıtır.
//  - Eşzamanlı/ardışık istekler `checkout_locks` ile tek işleme indirgenir: bekleyen (ödenmemiş) işlem
//    aynı plan için YENİDEN KULLANILIR, ödeme alınmışsa yeni işlem oluşturulmaz.
//  - Kalan risk (bekleyen iki farklı işlemin ikisinin de ödenmesi) webhook'ta "ÇİFT ABONELİK" olarak
//    tespit edilir ve DB'ye yazılmaz (bkz. paddle-webhook/logic.ts).

import { UPGRADE_MODE } from "../_shared/paddle-core.ts";
export { UPGRADE_MODE };

export type PaidTier = "personal" | "solo" | "studio";
export const PAID_TIERS: PaidTier[] = ["personal", "solo", "studio"];
export const TIER_RANK: Record<PaidTier, number> = { personal: 1, solo: 2, studio: 3 };
export const PRICE_ENV: Record<PaidTier, string> = {
  personal: "PADDLE_PRICE_PERSONAL",
  solo: "PADDLE_PRICE_SOLO",
  studio: "PADDLE_PRICE_STUDIO",
};

export const LOCK_INFLIGHT_MS = 60_000; // işlem oluşturulurken (çökme güvenliği)
export const LOCK_PENDING_MS = 15 * 60_000; // oluşturulmuş, ödenmemiş işlemin yeniden kullanım süresi

export interface ExistingSub {
  plan: string;
  status: string;
  paddle_subscription_id: string | null;
  pending_plan?: string | null;
  pending_plan_at?: string | null;
  current_period_end?: string | null;
}

export type CheckoutPlanDecision =
  | { kind: "new" }
  | { kind: "change"; direction: "upgrade" | "downgrade"; subscriptionId: string }
  | { kind: "clear-pending" } // mevcut plana yeniden tıklama: bekleyen dönem sonu düşürmeyi iptal eder
  | { kind: "block"; reason: "same-plan" | "payment-issue" | "paused" | "subscription-inconsistent" };

export function decideCheckout(existing: ExistingSub | null, requested: PaidTier): CheckoutPlanDecision {
  if (!existing || existing.plan === "free" || existing.status === "canceled") return { kind: "new" };
  if (existing.status === "past_due") return { kind: "block", reason: "payment-issue" };
  if (existing.status === "paused") return { kind: "block", reason: "paused" };
  if (!PAID_TIERS.includes(existing.plan as PaidTier) || !existing.paddle_subscription_id) {
    return { kind: "block", reason: "subscription-inconsistent" };
  }
  const current = existing.plan as PaidTier;
  if (current === requested) return existing.pending_plan ? { kind: "clear-pending" } : { kind: "block", reason: "same-plan" };
  return {
    kind: "change",
    direction: TIER_RANK[requested] > TIER_RANK[current] ? "upgrade" : "downgrade",
    subscriptionId: existing.paddle_subscription_id,
  };
}

// Yükseltme: hemen orantılı tahsilat. DÜŞÜRME: Paddle'da dönem sonuna zamanlanamaz; istek `pending_plan` olarak saklanır
// ve yenilemeden hemen önce `reconcile-subscriptions` (apply-downgrades) uygular. Kullanıcı o zamana kadar mevcut planı kullanır.
// ---------------------------------------------------------------------------
// Kilit (checkout_locks): user_id PK, plan, transaction_id, expires_at
// ---------------------------------------------------------------------------
export interface Lock {
  plan: string;
  transaction_id: string | null;
  expires_at: string; // ISO
}

export interface LockStore {
  insert(userId: string, lock: Lock): Promise<"ok" | "exists">; // başka hata -> fırlat
  get(userId: string): Promise<Lock | null>;
  /** Yalnızca satırın expires_at'i hâlâ `expectedExpiresAt` ise değiştirir (compare-and-set). */
  replaceIf(userId: string, expectedExpiresAt: string, lock: Lock): Promise<boolean>;
  setTransaction(userId: string, transactionId: string, expiresAt: string): Promise<void>;
  remove(userId: string): Promise<void>;
}

export type ClaimResult =
  | { state: "claimed" }
  | { state: "reuse"; transactionId: string }
  | { state: "busy" };

export async function claimLock(
  store: LockStore,
  userId: string,
  plan: PaidTier,
  nowMs: number,
  txnStatus: (transactionId: string) => Promise<string | null>,
): Promise<ClaimResult | { state: "processing" }> {
  const fresh = (): Lock => ({ plan, transaction_id: null, expires_at: new Date(nowMs + LOCK_INFLIGHT_MS).toISOString() });
  if ((await store.insert(userId, fresh())) === "ok") return { state: "claimed" };

  const cur = await store.get(userId);
  if (!cur) {
    // araya silme girdi: bir kez daha dene
    return (await store.insert(userId, fresh())) === "ok" ? { state: "claimed" } : { state: "busy" };
  }

  const expired = Date.parse(cur.expires_at) <= nowMs;
  if (!expired && !cur.transaction_id) return { state: "busy" }; // başka istek şu an işlem oluşturuyor

  if (!expired && cur.transaction_id && cur.plan === plan) {
    const s = await txnStatus(cur.transaction_id);
    if (s === "draft" || s === "ready") return { state: "reuse", transactionId: cur.transaction_id };
    if (s === "billed" || s === "paid" || s === "completed") return { state: "processing" }; // ödendi, webhook bekleniyor
    // canceled / past_due / bulunamadı: yeni işlem oluşturulabilir
  }
  // süresi dolmuş, farklı plan ya da kullanılamaz işlem: devral (compare-and-set)
  return (await store.replaceIf(userId, cur.expires_at, fresh())) ? { state: "claimed" } : { state: "busy" };
}

// ---------------------------------------------------------------------------
// İstek işleme
// ---------------------------------------------------------------------------
export interface PaddleApi {
  createTransaction(priceId: string, userId: string, plan: PaidTier): Promise<string>; // transactionId; hata -> fırlat
  getTransactionStatus(transactionId: string): Promise<string | null>;
  getSubscription(subscriptionId: string): Promise<{ status: string; scheduled_change: unknown; period_end?: string | null } | null>;
  changePlan(subscriptionId: string, priceId: string, prorationMode: string): Promise<void>;
}

export interface CheckoutDeps {
  now: () => number;
  /** "sandbox" | "production"; başka/boş değer -> null (fail-closed). */
  environment: "sandbox" | "production" | null;
  hasApiKey: boolean;
  /** Sandbox'ta yalnızca izinli test kullanıcıları (paddle-core userAllowedFor). */
  userAllowed(userId: string): boolean;
  priceFor(plan: PaidTier): string | undefined;
  getSubscription(userId: string): Promise<ExistingSub | null>;
  locks: LockStore;
  /** Dönem sonu düşürme isteğini yazar / temizler (service role). Hata -> fırlat. */
  setPending(userId: string, plan: PaidTier, effectiveAt: string): Promise<void>;
  clearPending(userId: string): Promise<void>;
  paddle: PaddleApi;
  log: { error: (...a: unknown[]) => void; warn: (...a: unknown[]) => void };
}

export interface CheckoutResult {
  status: number;
  body: Record<string, unknown>;
}

const refuse = (reason: string, extra: Record<string, unknown> = {}): CheckoutResult => ({ status: 200, body: { ok: false, reason, ...extra } });

export async function handleCheckout(deps: CheckoutDeps, userId: string, planInput: unknown): Promise<CheckoutResult> {
  const plan = typeof planInput === "string" && (PAID_TIERS as string[]).includes(planInput) ? (planInput as PaidTier) : null;
  if (!plan) return { status: 400, body: { ok: false, reason: "invalid-plan" } };

  const priceId = deps.priceFor(plan);
  if (!deps.hasApiKey || !priceId || !deps.environment) return refuse("not-configured"); // fail-closed: ortam belirsizse canlıya düşme

  if (!deps.userAllowed(userId)) return refuse("not-allowed"); // sandbox izolasyonu: canlı DB'ye test ödemesi yazılmasın

  try {
    const existing = await deps.getSubscription(userId);
    const d = decideCheckout(existing, plan);

    if (d.kind === "block") return refuse(d.reason);

    if (d.kind === "clear-pending") {
      await deps.clearPending(userId);
      return { status: 200, body: { ok: true, pendingCleared: true } };
    }

    if (d.kind === "change") {
      const live = await deps.paddle.getSubscription(d.subscriptionId);
      if (!live) return refuse("subscription-inconsistent");
      if (live.status !== "active" && live.status !== "trialing") return refuse(live.status === "past_due" ? "payment-issue" : "subscription-not-active");
      if (live.scheduled_change) return refuse("scheduled-change-pending"); // Paddle: bekleyen değişiklik varken kalem güncellenemez

      if (d.direction === "upgrade") {
        await deps.paddle.changePlan(d.subscriptionId, priceId, UPGRADE_MODE);
        return { status: 200, body: { ok: true, changed: true, direction: "upgrade" } };
      }
      // Düşürme: dönem sonunda uygulanır
      const effectiveAt = live.period_end ?? existing?.current_period_end ?? null;
      if (!effectiveAt || !Number.isFinite(Date.parse(effectiveAt))) return refuse("period-unknown");
      if (existing?.pending_plan === plan) return { status: 200, body: { ok: true, scheduled: true, direction: "downgrade", effectiveAt, already: true } };
      await deps.setPending(userId, plan, effectiveAt);
      return { status: 200, body: { ok: true, scheduled: true, direction: "downgrade", effectiveAt } };
    }

    // Yeni abonelik: kilit al
    const claim = await claimLock(deps.locks, userId, plan, deps.now(), (id) => deps.paddle.getTransactionStatus(id));
    if (claim.state === "busy") return refuse("checkout-in-progress");
    if (claim.state === "processing") return refuse("payment-processing");
    if (claim.state === "reuse") return { status: 200, body: { ok: true, transactionId: claim.transactionId, reused: true } };

    let transactionId: string;
    try {
      transactionId = await deps.paddle.createTransaction(priceId, userId, plan);
    } catch (err) {
      await deps.locks.remove(userId).catch(() => {});
      throw err;
    }
    await deps.locks.setTransaction(userId, transactionId, new Date(deps.now() + LOCK_PENDING_MS).toISOString());
    return { status: 200, body: { ok: true, transactionId } };
  } catch (err) {
    deps.log.error("create-checkout hatası:", err instanceof Error ? err.message : err);
    return refuse("provider-error");
  }
}
