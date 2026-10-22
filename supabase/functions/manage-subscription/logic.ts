// Planmoy — abonelik yönetimi karar mantığı (dış import YOK; node:test ile test edilir).
// Eylemler: portal (Paddle müşteri portalı bağlantısı), cancel (DÖNEM SONUNDA iptal), resume (planlı iptali geri al).
// Kural: Paddle çağrısı başarısızsa BAŞARI dönülmez (ok:false). İptal yalnızca dönem sonunda; anında iptal burada YOK.

export type Action = "portal" | "cancel" | "resume";
export const ACTIONS: Action[] = ["portal", "cancel", "resume"];

export interface SubRow {
  plan: string;
  status: string;
  paddle_subscription_id: string | null;
  paddle_customer_id: string | null;
}
export interface LiveSub {
  status: string;
  scheduled_change: { action?: string; effective_at?: string } | null;
}
export interface ManageDeps {
  environment: "sandbox" | "production" | null;
  hasApiKey: boolean;
  /** Sandbox izolasyonu: sandbox ortamında yalnızca izinli test kullanıcıları (production: herkes). */
  userAllowed(userId: string): boolean;
  getRow(userId: string): Promise<SubRow | null>;
  clearPending(userId: string): Promise<void>;
  paddle: {
    getSubscription(id: string): Promise<LiveSub | null>;
    cancelAtPeriodEnd(id: string): Promise<void>;
    removeScheduledChange(id: string): Promise<void>;
    portalUrl(customerId: string, subscriptionId: string): Promise<string>;
  };
  log: { error: (...a: unknown[]) => void; warn: (...a: unknown[]) => void };
}
export interface ManageResult { status: number; body: Record<string, unknown> }
const refuse = (reason: string): ManageResult => ({ status: 200, body: { ok: false, reason } });

export async function handleManage(deps: ManageDeps, userId: string, actionInput: unknown): Promise<ManageResult> {
  const action = typeof actionInput === "string" && (ACTIONS as string[]).includes(actionInput) ? (actionInput as Action) : null;
  if (!action) return { status: 400, body: { ok: false, reason: "invalid-action" } };
  if (!deps.hasApiKey || !deps.environment) return refuse("not-configured"); // fail-closed
  if (!deps.userAllowed(userId)) return refuse("not-allowed");

  try {
    const row = await deps.getRow(userId);
    if (!row || row.plan === "free" || row.status === "canceled" || !row.paddle_subscription_id) return refuse("no-subscription");
    const id = row.paddle_subscription_id;

    if (action === "portal") {
      if (!row.paddle_customer_id) return refuse("no-customer");
      return { status: 200, body: { ok: true, url: await deps.paddle.portalUrl(row.paddle_customer_id, id) } };
    }

    const live = await deps.paddle.getSubscription(id);
    if (!live) return refuse("subscription-inconsistent");
    if (live.status === "canceled") return refuse("already-canceled");
    const sched = live.scheduled_change;

    if (action === "cancel") {
      if (sched?.action === "cancel") return { status: 200, body: { ok: true, scheduled: true, already: true, effectiveAt: sched.effective_at ?? null } };
      if (sched) return refuse("scheduled-change-pending"); // örn. duraklatma planlı
      await deps.paddle.cancelAtPeriodEnd(id); // fırlatırsa -> provider-error (başarı mesajı YOK)
      const after = await deps.paddle.getSubscription(id); // doğrula: gerçekten planlandı mı?
      if (after?.scheduled_change?.action !== "cancel" && after?.status !== "canceled") return refuse("cancel-unverified");
      await deps.clearPending(userId).catch((e) => deps.log.warn("pending_plan temizlenemedi:", e instanceof Error ? e.message : e));
      return { status: 200, body: { ok: true, scheduled: true, effectiveAt: after?.scheduled_change?.effective_at ?? null } };
    }

    // resume
    if (sched?.action !== "cancel") return refuse("nothing-to-resume");
    await deps.paddle.removeScheduledChange(id);
    const after = await deps.paddle.getSubscription(id);
    if (after?.scheduled_change) return refuse("resume-unverified");
    return { status: 200, body: { ok: true, resumed: true } };
  } catch (err) {
    deps.log.error("manage-subscription hatası:", err instanceof Error ? err.message : err);
    return refuse("provider-error");
  }
}
