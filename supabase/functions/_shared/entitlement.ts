// Planmoy — plan hakkı (entitlement) tek kaynağı. Hem Edge Function'lar (cost-cap) hem istemci (usePlan) kullanır.
// Dış import YOK. Kurallar:
//  - active            : hak verir. Dönem sonu iptali planlıysa (cancel_at) o tarihe kadar sürer (+12 sa webhook gecikmesi payı);
//                        daha sonra webhook kaçırılmış olsa bile hak KAPANIR (fail-closed).
//  - past_due          : past_due_since'ten itibaren 3 gün hoşgörü; past_due_since yoksa/geçersizse hak YOK.
//  - paused/canceled/diğer : hak yok.
export const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;
export const CANCEL_LAG_MS = 12 * 60 * 60 * 1000;

export type EffectivePlan = "free" | "personal" | "solo" | "studio";
const PAID = ["personal", "solo", "studio"];

export interface EntitlementRow {
  plan?: string | null;
  status?: string | null;
  past_due_since?: string | null;
  cancel_at?: string | null;
  scheduled_action?: string | null;
}

export function effectivePlan(row: EntitlementRow | null | undefined, nowMs: number): EffectivePlan {
  if (!row || !row.plan || !PAID.includes(row.plan)) return "free";
  const plan = row.plan as EffectivePlan;
  if (row.status === "active") {
    if (row.scheduled_action === "cancel" && row.cancel_at) {
      const at = Date.parse(row.cancel_at);
      if (Number.isFinite(at) && nowMs > at + CANCEL_LAG_MS) return "free";
    }
    return plan;
  }
  if (row.status === "past_due") {
    const since = row.past_due_since ? Date.parse(row.past_due_since) : NaN;
    return Number.isFinite(since) && nowMs < since + PAST_DUE_GRACE_MS ? plan : "free";
  }
  return "free";
}

/** past_due hoşgörüsünün bittiği an (ISO) ya da null. Arayüz uyarısı için. */
export function graceEndsAt(row: EntitlementRow | null | undefined): string | null {
  if (row?.status !== "past_due" || !row.past_due_since) return null;
  const since = Date.parse(row.past_due_since);
  return Number.isFinite(since) ? new Date(since + PAST_DUE_GRACE_MS).toISOString() : null;
}
