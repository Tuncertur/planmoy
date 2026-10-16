// Planmoy — paddle-webhook saf mantığı (Deno ve Node'dan bağımsız; dış import YOK).
// index.ts yalnızca ortamı (Deno.env, Supabase istemcisi) bağlar; karar mantığı burada
// olduğu için Node `node:test` ile otomatik test edilir (bkz. logic.test.ts).
//
// İlkeler:
//  - Plan YALNIZCA Paddle'ın güncel fiyat kimliğinden (items[].price.id) türetilir; custom_data.tier
//    planı belirlemek için kullanılmaz (yükseltme/yenilemede eski değeri taşıdığı için eziyordu).
//  - Yalnızca gerçek unique ihlali (23505) "duplicate"tir; diğer veritabanı hataları fırlatılır
//    (HTTP 500 -> Paddle güvenle yeniden dener).
//  - Kullanıcı sorgusu hata verirse "kullanıcı yok" varsayılmaz (yalnızca açık 404/user_not_found).
//  - Eski (occurred_at'i daha eski) olaylar güncel durumu bozamaz; yazma, compare-and-set ile yapılır.

import {
  buildPriceTierMap, extractPriceIds, mapStatus, PRICE_ENV_BY_TIER, STATUS_BY_EVENT, tierFromData, UUID_RE,
  type PaidTier, type SubStatus, type Tier, type TierResult,
} from "../_shared/paddle-core.ts";
// Test ve diğer modüller için yeniden dışa aktarım (geriye uyumluluk)
import { parseUserAllowlist, userAllowedFor } from "../_shared/paddle-core.ts";
export { buildPriceTierMap, extractPriceIds, mapStatus, parseUserAllowlist, PRICE_ENV_BY_TIER, tierFromData, userAllowedFor };
export type { PaidTier, SubStatus, Tier, TierResult };

// ---------------------------------------------------------------------------
// Karar: bir olay veritabanında ne değiştirir?
// ---------------------------------------------------------------------------
export interface ExistingRow {
  plan: string;
  status: string;
  paddle_subscription_id: string | null;
  paddle_customer_id?: string | null;
  last_event_at: string | null;
  past_due_since?: string | null;
  pending_plan?: string | null;
  pending_plan_at?: string | null;
}

export interface WriteRow {
  user_id: string;
  plan: Tier;
  status: SubStatus;
  last_event_at: string;
  updated_at: string;
  paddle_subscription_id?: string;
  paddle_customer_id?: string;
  current_period_end?: string;
  // 0029 alanları: undefined = dokunma, null = temizle
  cancel_at?: string | null;
  scheduled_action?: "cancel" | "pause" | null;
  past_due_since?: string | null;
  pending_plan?: null;
  pending_plan_at?: null;
}

export type Decision =
  | { action: "skip"; reason: string; level: "info" | "warn" | "error" }
  | { action: "write"; row: WriteRow; note?: string };

const skip = (reason: string, level: "info" | "warn" | "error" = "info"): Decision => ({ action: "skip", reason, level });

export function subscriptionIdOf(eventType: string, data: any): string | undefined {
  const id = eventType.startsWith("subscription.") ? data?.id : data?.subscription_id;
  return typeof id === "string" ? id : undefined;
}

export function decide(
  eventType: string,
  data: any,
  occurredAt: string,
  userId: string,
  existing: ExistingRow | null,
  priceTier: Record<string, PaidTier>,
  nowIso: string,
): Decision {
  const occurredMs = Date.parse(occurredAt);
  if (!Number.isFinite(occurredMs)) return skip("occurred_at geçersiz", "error");

  const subId = subscriptionIdOf(eventType, data);
  if (!subId) return skip("abonelik kimliği yok (abonelik dışı işlem)", "info");

  // 1) Sıra dışı (eski) olay: güncel durumu bozamaz.
  if (existing?.last_event_at && Date.parse(existing.last_event_at) > occurredMs) {
    return skip("eski olay yoksayıldı (last_event_at daha yeni)", "warn");
  }

  // 2) Başka bir aboneliğin olayı: mevcut canlı aboneliği bozamaz / ikinci abonelik tespiti.
  const existingLive =
    !!existing?.paddle_subscription_id &&
    existing.paddle_subscription_id !== subId &&
    existing.status !== "canceled" &&
    existing.plan !== "free";
  if (existingLive) {
    return skip(
      eventType === "subscription.created" || eventType === "transaction.completed"
        ? "ÇİFT ABONELİK: kullanıcının başka bir canlı aboneliği var, DB değişmedi (Paddle'da manuel inceleme gerekir)"
        : "başka aboneliğe ait olay, mevcut canlı abonelik korunuyor",
      eventType === "subscription.created" || eventType === "transaction.completed" ? "error" : "warn",
    );
  }
  const sameSub = !!existing?.paddle_subscription_id && existing.paddle_subscription_id === subId;

  const base = (plan: Tier, status: SubStatus): WriteRow => {
    const row: WriteRow = { user_id: userId, plan, status, last_event_at: occurredAt, updated_at: nowIso, paddle_subscription_id: subId };
    if (typeof data?.customer_id === "string") row.paddle_customer_id = data.customer_id;
    const periodEnd = data?.current_billing_period?.ends_at;
    if (eventType.startsWith("subscription.") && typeof periodEnd === "string" && status !== "canceled") row.current_period_end = periodEnd;

    // Ödeme sorunu başlangıcı (3 günlük hoşgörü bundan sayılır): zaten past_due ise ilk anı KORU.
    row.past_due_since = status === "past_due" ? (sameSub && existing?.status === "past_due" && existing.past_due_since ? existing.past_due_since : occurredAt) : null;

    // Paddle'daki bekleyen iptal/duraklatma (yalnız subscription.* olaylarında alan bulunur).
    if (eventType.startsWith("subscription.") && data && "scheduled_change" in data) {
      const sc = data.scheduled_change;
      if (status !== "canceled" && (sc?.action === "cancel" || sc?.action === "pause") && typeof sc?.effective_at === "string") {
        row.scheduled_action = sc.action;
        row.cancel_at = sc.effective_at;
      } else {
        row.scheduled_action = null;
        row.cancel_at = null;
      }
    }

    // Dönem sonu düşürme isteği: plan DEĞİŞTİYSE (yükseltme/uygulanmış düşürme), iptal olduysa ya da başka abonelikse temizle.
    if (existing?.pending_plan && (!sameSub || plan !== existing.plan || status === "canceled")) {
      row.pending_plan = null;
      row.pending_plan_at = null;
    }
    return row;
  };

  // 3) transaction.completed: ödeme alındı. Planı DEĞİŞTİRMEZ (orantılı fatura kalemleri eski/yeni
  //    fiyatı birlikte taşıyabilir); yalnızca (a) hiç kayıt yoksa ilk satın almayı oluşturur,
  //    (b) ödemesi gecikmiş (past_due) aboneliği yeniden etkinleştirir.
  if (eventType === "transaction.completed") {
    if (sameSub) {
      if (existing!.status === "past_due") return { action: "write", row: base(existing!.plan as Tier, "active"), note: "ödeme alındı, past_due -> active" };
      return skip("aboneliğin planı/durumu transaction.completed ile değişmez", "info");
    }
    const t = tierFromData(data, priceTier);
    if (t.kind !== "tier") return skip(`ilk satın alma planı belirlenemedi (${t.kind})`, "error");
    return { action: "write", row: base(t.tier, "active") };
  }

  // 4) subscription.* olayları
  const statusText = typeof data?.status === "string" ? data.status : STATUS_BY_EVENT[eventType];
  const { status, known } = mapStatus(statusText);
  const note = known ? undefined : `bilinmeyen Paddle durumu (${String(statusText)}), erişim verilmedi`;

  if (status === "canceled") return { action: "write", row: base("free", "canceled"), note };

  const t = tierFromData(data, priceTier);
  if (t.kind === "tier") return { action: "write", row: base(t.tier, status), note };

  // Fiyat belirlenemedi: aynı aboneliğin mevcut planı korunarak yalnızca durum güncellenir.
  if (sameSub && existing!.plan !== "free") {
    return { action: "write", row: base(existing!.plan as Tier, status), note: `fiyat kimliği tanınmadı (${t.kind}), mevcut plan korundu` };
  }
  return skip(`plan belirlenemedi (${t.kind})`, "error");
}

// ---------------------------------------------------------------------------
// Olay işleme (bağımlılıklar enjekte edilir)
// ---------------------------------------------------------------------------
export interface Deps {
  priceTier: Record<string, PaidTier>;
  now: () => string;
  /** "claimed" | "duplicate"; unique ihlali dışındaki her hata FIRLATILIR. */
  claimEvent(eventId: string, eventType: string): Promise<"claimed" | "duplicate">;
  releaseEvent(eventId: string): Promise<void>;
  /** true/false; yalnızca açık "kullanıcı yok" yanıtı false döner, diğer hatalar FIRLATILIR. */
  userExists(userId: string): Promise<boolean>;
  /** Sandbox'ta yalnızca izinli test kullanıcıları (bkz. paddle-core userAllowedFor); izinsizse olay yazılmaz. */
  userAllowed(userId: string): boolean;
  findUserBySubscription(subscriptionId: string): Promise<string | null>;
  getSubscription(userId: string): Promise<ExistingRow | null>;
  /** expected: okunan satır (yoksa null). Başkası araya girdiyse "conflict". Diğer hatalar FIRLATILIR. */
  writeSubscription(userId: string, expected: ExistingRow | null, row: WriteRow): Promise<"ok" | "conflict">;
  log: { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void; error: (...a: unknown[]) => void };
}

export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

const HANDLED = (t: string) => t.startsWith("subscription.") || t === "transaction.completed";

export async function handleEvent(deps: Deps, event: any): Promise<HandlerResult> {
  const eventType: string | undefined = event?.event_type;
  const eventId: string | undefined = event?.event_id ?? event?.id;
  if (typeof eventType !== "string" || !HANDLED(eventType)) {
    return { status: 200, body: { received: true, ignored: true } };
  }

  let claimed = false;
  try {
    if (eventId) {
      if ((await deps.claimEvent(eventId, eventType)) === "duplicate") {
        return { status: 200, body: { received: true, duplicate: true } };
      }
      claimed = true;
    } else {
      deps.log.warn("event_id yok, tekilleştirme yapılamadı", { eventType });
    }

    if (Object.keys(deps.priceTier).length === 0) throw new Error("PADDLE_PRICE_* secret'ları tanımlı değil (yapılandırma hatası)");

    const data = event.data ?? {};
    const occurredAt: string = event.occurred_at;
    const subId = subscriptionIdOf(eventType, data);

    let userId: string | undefined = typeof data?.custom_data?.supabase_user_id === "string" ? data.custom_data.supabase_user_id : undefined;
    if (userId && !UUID_RE.test(userId)) {
      deps.log.error("custom_data.supabase_user_id geçerli bir UUID değil, olay yoksayıldı", { eventType });
      return { status: 200, body: { received: true, skipped: "invalid-user-id" } };
    }
    if (!userId && subId) userId = (await deps.findUserBySubscription(subId)) ?? undefined;
    if (!userId) {
      deps.log.error("olay bir kullanıcıya bağlanamadı (custom_data ve abonelik kaydı yok)", { eventType, subId });
      return { status: 200, body: { received: true, skipped: "no-user" } };
    }

    if (!(await deps.userExists(userId))) {
      deps.log.error("ORPHAN: olay silinmiş/olmayan bir kullanıcıya ait (Paddle'da abonelik hâlâ aktif olabilir)", { eventType, subId });
      return { status: 200, body: { received: true, skipped: "user-not-found" } };
    }

    if (!deps.userAllowed(userId)) {
      deps.log.error("webhook atlandı: kullanıcı bu ortamda izinli değil (sandbox izin listesi / ortam belirsiz)", { eventType, subId });
      return { status: 200, body: { received: true, skipped: "user-not-allowed" } };
    }

    const existing = await deps.getSubscription(userId);
    const decision = decide(eventType, data, occurredAt, userId, existing, deps.priceTier, deps.now());
    if (decision.action === "skip") {
      deps.log[decision.level](`webhook atlandı: ${decision.reason}`, { eventType, subId });
      return { status: 200, body: { received: true, skipped: decision.reason } };
    }
    if (decision.note) deps.log.warn(decision.note, { eventType, subId });

    const result = await deps.writeSubscription(userId, existing, decision.row);
    if (result === "conflict") throw new Error("subscription-write-conflict"); // eşzamanlı yazma: 500 -> Paddle yeniden dener
    return { status: 200, body: { received: true } };
  } catch (err) {
    deps.log.error("Webhook işleme hatası:", err instanceof Error ? err.message : err);
    if (claimed && eventId) {
      try {
        await deps.releaseEvent(eventId);
      } catch (releaseErr) {
        deps.log.error("işlenme işareti kaldırılamadı (olay yeniden denemede duplicate sayılabilir)", releaseErr);
      }
    }
    return { status: 500, body: { error: "internal" } };
  }
}

// ---------------------------------------------------------------------------
// Veritabanı/Auth hata sınıflandırması (index.ts bunları kullanır; testlidir)
// ---------------------------------------------------------------------------
export const UNIQUE_VIOLATION = "23505";

/** processed_webhook_events insert sonucu: YALNIZCA unique ihlali "duplicate"; diğer hatalar fırlatılır. */
export function claimResultFromInsertError(error: { code?: string; message?: string } | null): "claimed" | "duplicate" {
  if (!error) return "claimed";
  if (error.code === UNIQUE_VIOLATION) return "duplicate";
  throw new Error(`processed_webhook_events insert hatası: ${error.code ?? ""} ${error.message ?? ""}`);
}

/** auth.admin.getUserById sonucu: yalnızca açık 404/user_not_found "kullanıcı yok"; belirsiz hata fırlatılır. */
export function userExistsFromAuthResult(data: { user?: unknown } | null, error: { status?: number; code?: string } | null): boolean {
  if (error) {
    if (error.status === 404 || error.code === "user_not_found") return false;
    throw new Error(`getUserById hatası: ${error.status ?? ""} ${error.code ?? ""}`);
  }
  return !!data?.user;
}

// ---------------------------------------------------------------------------
// İmza doğrulaması (Paddle-Signature: "ts=...;h1=...[;h1=...]")
// ---------------------------------------------------------------------------
export const MAX_SIGNATURE_AGE_MS = 4 * 24 * 60 * 60 * 1000;

export function parseSignatureHeader(header: string): { ts?: string; h1: string[] } {
  const out: { ts?: string; h1: string[] } = { h1: [] };
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "ts") out.ts = v;
    else if (k === "h1" && v) out.h1.push(v);
  }
  return out;
}

export async function verifySignature(rawBody: string, header: string | null, secret: string | undefined, nowMs: number): Promise<boolean> {
  if (!header || !secret) return false; // gizli anahtar yoksa HİÇBİR ŞEYİ kabul etme
  const { ts, h1 } = parseSignatureHeader(header);
  if (!ts || h1.length === 0) return false;
  const tsMs = Number(ts) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs(nowMs - tsMs) > MAX_SIGNATURE_AGE_MS) return false;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${rawBody}`));
  const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");

  // Secret döndürme sırasında birden fazla h1 gelebilir; herhangi biri eşleşirse geçerli (sabit zamanlı).
  let ok = false;
  for (const candidate of h1) {
    if (candidate.length !== computed.length) continue;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ candidate.charCodeAt(i);
    if (diff === 0) ok = true;
  }
  return ok;
}
