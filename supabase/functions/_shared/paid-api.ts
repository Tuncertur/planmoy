// Planmoy — ücretli dış API koruması (istemci tarafı sarmalayıcı + saf hesaplar). SQL karşılığı: migration 0032.
// Akış: reservePaidApi() → sağlayıcı çağrısı → settlePaidApi(gerçek maliyet | iade). Dış import YOK (Node ve Deno ile test edilir).
// KURAL: maliyet bilgisi alınamazsa (RPC hatası/tablo yok) ücretli çağrı YAPILMAZ (fail-closed).

export type Plan = "free" | "personal" | "solo" | "studio";

// Plan başına aylık ÜCRETLİ API politikası. Free = $0 (hiç ücretli çağrı yok).
// Dolar tavanı = metin-AI bütçesi + ek API/değişken altyapı başlangıç bütçesi (kullanıcı önerisi; DOĞRULANMIŞ NİHAİ LİMİT DEĞİL).
export const PLAN_POLICY: Record<Plan, { userCapUsd: number; textQueries: number }> = {
  free: { userCapUsd: 0, textQueries: 0 },
  personal: { userCapUsd: 0.24 + 0.15, textQueries: 200 },
  solo: { userCapUsd: 0.6 + 0.4, textQueries: 500 },
  studio: { userCapUsd: 1.2 + 1.5, textQueries: 1000 },
};
export const DEFAULT_PROJECT_CAP_USD = 150; // ortam değişkeni PROJECT_MONTHLY_CAP_USD ile değiştirilir

export function policyFor(plan: string): { userCapUsd: number; textQueries: number } {
  return PLAN_POLICY[(plan as Plan) in PLAN_POLICY ? (plan as Plan) : "free"];
}
export function projectCapFromEnv(v: string | undefined | null): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PROJECT_CAP_USD;
}
export function monthKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 7); // UTC 'YYYY-MM' — sayaçlar ay anahtarıyla sıfırlanır
}

// ---- Gemini maliyeti ----
export type Rates = { inputPerM: number; outputPerM: number };
// Ortam değişkeni yoksa İHTİYATLI (yüksek) tarife: defter gerçek maliyeti hep fazla sayar, hiçbir zaman eksik saymaz.
export const CONSERVATIVE_RATES: Rates = { inputPerM: 1.5, outputPerM: 7.5 };
export function ratesFromEnv(inp: string | undefined | null, out: string | undefined | null): Rates {
  const i = Number(inp), o = Number(out);
  return Number.isFinite(i) && i > 0 && Number.isFinite(o) && o > 0 ? { inputPerM: i, outputPerM: o } : CONSERVATIVE_RATES;
}
/** Türkçe için karakter başına ~3 karakter/token varsayımı (ihtiyatlı). */
export function estimateTokens(chars: number): number { return Math.ceil(Math.max(0, chars) / 3); }
export function geminiReserveUsd(systemChars: number, promptChars: number, maxOutputTokens: number, r: Rates): number {
  return (estimateTokens(systemChars + promptChars) * r.inputPerM + Math.max(0, maxOutputTokens) * r.outputPerM) / 1e6;
}
/** Sağlayıcının bildirdiği gerçek kullanımdan maliyet. Düşünme (thinking) token'ları çıktı olarak ücretlenir. Bilgi yoksa null. */
export function geminiActualUsd(usage: unknown, r: Rates): number | null {
  if (!usage || typeof usage !== "object") return null;
  const u = usage as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
  const inTok = num(u.promptTokenCount);
  if (inTok === null) return null;
  const out = (num(u.candidatesTokenCount) ?? 0) + (num(u.thoughtsTokenCount) ?? 0);
  return (inTok * r.inputPerM + out * r.outputPerM) / 1e6;
}

// ---- Çift ücretlendirme önleme ----
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
/** İstemci request_id verirse onu kullanır; vermezse aynı içerik 10 sn pencerede aynı anahtarı üretir (çift dokunma/tekrar). */
export function idemKeyFor(surface: string, requestId: unknown, content: string, nowMs: number, windowMs = 10_000): string {
  if (typeof requestId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(requestId)) return `${surface}:rid:${requestId}`;
  return `${surface}:c:${fnv1a(content)}:${Math.floor(nowMs / windowMs)}`;
}

// ---- RPC sarmalayıcıları (fail-closed) ----
export type Denial = "plan-has-no-paid-api" | "monthly-query-limit-reached" | "monthly-cost-cap-reached" | "project-cap-reached" | "duplicate-request" | "invalid-request" | "cost-check-failed";
export type Reservation = { allowed: true; ledgerId: string } | { allowed: false; reason: Denial };
type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

export async function reservePaidApi(
  admin: Rpc,
  a: { userId: string; surface: string; amountUsd: number; plan: string; countsQuery: boolean; idemKey?: string | null; projectCapUsd: number; now?: Date },
): Promise<Reservation> {
  const pol = policyFor(a.plan);
  try {
    const { data, error } = await admin.rpc("reserve_paid_api", {
      p_user_id: a.userId, p_month: monthKey(a.now), p_surface: a.surface, p_amount: a.amountUsd,
      p_user_cap: pol.userCapUsd, p_counts_query: a.countsQuery, p_query_limit: pol.textQueries,
      p_project_cap: a.projectCapUsd, p_idem_key: a.idemKey ?? null,
    });
    const r = data as { allowed?: unknown; reason?: unknown; ledger_id?: unknown } | null;
    if (error || !r || typeof r !== "object") return { allowed: false, reason: "cost-check-failed" };
    if (r.allowed === true && typeof r.ledger_id === "string") return { allowed: true, ledgerId: r.ledger_id };
    return { allowed: false, reason: typeof r.reason === "string" ? (r.reason as Denial) : "cost-check-failed" };
  } catch {
    return { allowed: false, reason: "cost-check-failed" };
  }
}

/** Sağlayıcı ücret yazdıysa billed=true + gerçek tutar; hata/zaman aşımında billed=false (tam iade). Başarısız kapanış tutarı rezervede bırakır (ihtiyatlı). */
export async function settlePaidApi(admin: Rpc, ledgerId: string, actualUsd: number | null, billed: boolean, reservedUsd: number): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("settle_paid_api", { p_ledger_id: ledgerId, p_actual: billed ? (actualUsd ?? reservedUsd) : 0, p_provider_billed: billed });
    return !error && data === true;
  } catch {
    return false;
  }
}

/** İstemciye giden kullanıcı dostu neden: iç ayrıntı sızdırmaz. */
export function publicReason(r: Denial): "free-plan" | "query-limit" | "cost-cap" | "busy" | "duplicate" | "unavailable" {
  switch (r) {
    case "plan-has-no-paid-api": return "free-plan";
    case "monthly-query-limit-reached": return "query-limit";
    case "monthly-cost-cap-reached": return "cost-cap";
    case "project-cap-reached": return "busy";
    case "duplicate-request": return "duplicate";
    default: return "unavailable";
  }
}
