// Planmoy — AI kullanım DÖNEMİ (sayaç sıfırlama anahtarı). SQL karşılığı: migration 0033 (p_period). Dış import YOK.
// Kural: ücretli abonelikte dönem = gerçek faturalama dönemi (subscriptions.current_period_end → 'b:YYYY-MM-DD').
// current_period_end yoksa/geçersizse/geçmişteyse (yenileme webhook'u gecikmiş olabilir) takvim ayına ('YYYY-MM') düşülür ve
// `approximate: true` döner — arayüz "yaklaşık" der; uydurma kesin tarih GÖSTERİLMEZ.
// Proje maliyet tavanı sağlayıcı faturası takvim ayı olduğu için bu anahtardan BAĞIMSIZ, takvim ayında kalır.

export interface PeriodRow { current_period_end?: string | null }
export interface UsagePeriod {
  key: string;            // 'b:YYYY-MM-DD' (faturalama) | 'YYYY-MM' (takvim)
  kind: "billing" | "calendar";
  resetAt: string;        // ISO — sayacın sıfırlanacağı an
  approximate: boolean;   // takvim ayı varsayımı mı
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function calendarMonthKey(nowMs: number): string { return new Date(nowMs).toISOString().slice(0, 7); }
export function nextMonthStartIso(nowMs: number): string {
  const d = new Date(nowMs);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}

/** @param paid etkin plan ücretli mi (effectivePlan !== 'free'); Free her zaman takvim ayıdır. */
export function usagePeriodFor(row: PeriodRow | null | undefined, paid: boolean, nowMs: number): UsagePeriod {
  const cal: UsagePeriod = { key: calendarMonthKey(nowMs), kind: "calendar", resetAt: nextMonthStartIso(nowMs), approximate: paid };
  if (!paid || !row?.current_period_end) return cal;
  const end = Date.parse(row.current_period_end);
  if (!Number.isFinite(end) || end <= nowMs) return cal;
  const key = "b:" + new Date(end).toISOString().slice(0, 10);
  return { key, kind: "billing", resetAt: new Date(end).toISOString(), approximate: false };
}

export function isPeriodKey(k: unknown): k is string {
  return typeof k === "string" && (/^\d{4}-\d{2}$/.test(k) || (k.startsWith("b:") && DAY.test(k.slice(2))));
}
