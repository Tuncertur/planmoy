// Planmoy — AI kullanım sayacı: SAF hesaplar (dış import yok; Node ile test edilir).
// Kural: sayılar yalnızca SUNUCUDAN gelir ve burada doğrulanır; geçersizse "unavailable" döner — uydurma kalan değer ASLA üretilmez.

export type UsageState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "free" }
  | { kind: "ok"; plan: string; limit: number; used: number; remaining: number; resetAt: string | null; approximate: boolean };

export type Level = "ok" | "mid" | "low" | "full"; // renk kademesi
const PLANS = ["personal", "solo", "studio"];

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 1_000_000;

/** Sunucu yanıtını doğrular. Tutarsız/eksik/şüpheli → unavailable (kalan değer uydurulmaz). */
export function parseUsage(data: unknown): UsageState {
  if (!data || typeof data !== "object") return { kind: "unavailable" };
  const d = data as Record<string, unknown>;
  if (d.ok !== true) return { kind: "unavailable" };
  if (d.plan === "free") return { kind: "free" };
  if (typeof d.plan !== "string" || !PLANS.includes(d.plan)) return { kind: "unavailable" };
  if (!isInt(d.limit) || !isInt(d.used) || d.limit === 0) return { kind: "unavailable" };
  // Sunucudan gelen `remaining` değerine güvenmeyiz; limit-used'tan türetiriz (tutarsızsa reddet).
  const remaining = Math.max(d.limit - d.used, 0);
  if (d.remaining !== undefined && d.remaining !== remaining) return { kind: "unavailable" };
  const resetAt = typeof d.resetAt === "string" && Number.isFinite(Date.parse(d.resetAt)) ? d.resetAt : null;
  return { kind: "ok", plan: d.plan, limit: d.limit, used: d.used, remaining, resetAt, approximate: d.approximate === true };
}

/** Kullanılan yüzde (0–100, tam sayı). Sınırı aşan kullanım 100'e sabitlenir. */
export function percentUsed(used: number, limit: number): number {
  if (!(limit > 0)) return 0;
  return Math.min(100, Math.max(0, Math.floor((used / limit) * 100)));
}

/** Renk kademesi: kalan azaldıkça değişir. ok <50% · mid 50–79% · low ≥80% (bilgi mesajı) · full =100% */
export function levelFor(used: number, limit: number): Level {
  if (!(limit > 0)) return "full";
  if (used >= limit) return "full";
  const p = (used / limit) * 100;
  return p >= 80 ? "low" : p >= 50 ? "mid" : "ok";
}

/** %80 bilgi mesajı eşiği. */
export const showsNearLimit = (used: number, limit: number) => limit > 0 && used < limit && used / limit >= 0.8;

/** Yerel tarih metni; geçersizse boş (uydurma tarih yok). */
export function formatDate(iso: string | null, locale: string): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "";
  try { return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleDateString(); }
}
