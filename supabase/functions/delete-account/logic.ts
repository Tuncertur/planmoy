// Planmoy — hesap silme güvenli akışı (dış import YOK; node:test ile test edilir).
// Kural: Paddle'da CANLI abonelik varsa ÖNCE anında iptal edilir ve iptal DOĞRULANIR; iptal/doğrulama başarısızsa
// hesap SİLİNMEZ ve başarı dönülmez (kontrolsüz tahsilat riski). Paddle okunamıyorsa (ortam/anahtar/API) yine silinmez.
export const LIVE_STATUSES = ["active", "trialing", "past_due", "paused"];

export type Outcome = "deleted" | "cancel-failed" | "delete-failed" | "unverifiable";
export interface DeleteDeps {
  environment: "sandbox" | "production" | null;
  hasApiKey: boolean;
  getRow(userId: string): Promise<{ paddle_subscription_id: string | null; paddle_customer_id: string | null } | null>;
  paddle: {
    getStatus(subscriptionId: string): Promise<string | null>; // 404 -> null
    liveIdsOfCustomer(customerId: string): Promise<string[]>;
    cancelNow(subscriptionId: string): Promise<void>;
  };
  deleteUser(userId: string): Promise<void>; // hata -> fırlat
  hash(userId: string): Promise<string>;
  writeLog(e: { user_hash: string; paddle_subscription_id: string | null; paddle_status_before: string | null; subscription_canceled: boolean; outcome: Outcome; note?: string }): Promise<void>;
  log: { error: (...a: unknown[]) => void; warn: (...a: unknown[]) => void };
}
export interface DeleteResult { status: number; body: Record<string, unknown> }

export async function handleDelete(deps: DeleteDeps, userId: string): Promise<DeleteResult> {
  const hash = await deps.hash(userId);
  const logSafe = async (e: Parameters<DeleteDeps["writeLog"]>[0]) => {
    try { await deps.writeLog(e); } catch (err) { deps.log.warn("account_deletion_log yazılamadı:", err instanceof Error ? err.message : err); }
  };
  const fail = (reason: string, status: number, extra: Record<string, unknown> = {}): DeleteResult => ({ status, body: { ok: false, reason, ...extra } });

  let row: Awaited<ReturnType<DeleteDeps["getRow"]>>;
  try { row = await deps.getRow(userId); } catch (err) {
    deps.log.error("abonelik okunamadı:", err instanceof Error ? err.message : err);
    return fail("unverifiable", 502); // abonelik durumu bilinmiyor -> silme
  }

  const subIds = new Set<string>();
  let statusBefore: string | null = null;
  if (row && (row.paddle_subscription_id || row.paddle_customer_id)) {
    if (!deps.hasApiKey || !deps.environment) {
      await logSafe({ user_hash: hash, paddle_subscription_id: row.paddle_subscription_id, paddle_status_before: null, subscription_canceled: false, outcome: "unverifiable", note: "paddle yapılandırılmamış" });
      return fail("unverifiable", 503); // Paddle'a erişemeden ödeme kaydı olan hesabı SİLME
    }
    try {
      if (row.paddle_subscription_id) {
        statusBefore = await deps.paddle.getStatus(row.paddle_subscription_id);
        if (statusBefore && LIVE_STATUSES.includes(statusBefore)) subIds.add(row.paddle_subscription_id);
      }
      if (row.paddle_customer_id) for (const id of await deps.paddle.liveIdsOfCustomer(row.paddle_customer_id)) subIds.add(id);
    } catch (err) {
      deps.log.error("Paddle okunamadı:", err instanceof Error ? err.message : err);
      await logSafe({ user_hash: hash, paddle_subscription_id: row.paddle_subscription_id, paddle_status_before: null, subscription_canceled: false, outcome: "unverifiable", note: "paddle okuma hatası" });
      return fail("unverifiable", 502);
    }
  }

  let canceled = false;
  for (const id of subIds) {
    try {
      await deps.paddle.cancelNow(id);
      const after = await deps.paddle.getStatus(id);
      if (after !== "canceled") throw new Error(`iptal doğrulanamadı (durum: ${after})`);
      canceled = true;
    } catch (err) {
      deps.log.error("Paddle iptali başarısız:", err instanceof Error ? err.message : err);
      await logSafe({ user_hash: hash, paddle_subscription_id: row?.paddle_subscription_id ?? null, paddle_status_before: statusBefore, subscription_canceled: canceled, outcome: "cancel-failed", note: "iptal başarısız veya doğrulanamadı; hesap silinmedi" });
      return fail("subscription-cancel-failed", 502, { accountDeleted: false });
    }
  }

  try {
    await deps.deleteUser(userId);
  } catch (err) {
    deps.log.error("kullanıcı silinemedi:", err instanceof Error ? err.message : err);
    await logSafe({ user_hash: hash, paddle_subscription_id: row?.paddle_subscription_id ?? null, paddle_status_before: statusBefore, subscription_canceled: canceled, outcome: "delete-failed" });
    return fail("delete-failed", 500, { subscriptionCanceled: canceled }); // abonelik iptal, hesap duruyor: tekrar denenebilir
  }
  await logSafe({ user_hash: hash, paddle_subscription_id: row?.paddle_subscription_id ?? null, paddle_status_before: statusBefore, subscription_canceled: canceled, outcome: "deleted" });
  return { status: 200, body: { ok: true, subscriptionCanceled: canceled } };
}
