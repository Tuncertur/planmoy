// Planmoy — dış kaynaklı (Google Places vb.) adreslerin güvenli kullanımı. Yalnızca http(s) şemasına izin verilir
// (javascript:, data:, vbscript: ve diğerleri reddedilir). Saf fonksiyonlar; dış import yok.
export function safeHttpUrl(u: unknown): string | null {
  if (typeof u !== "string" || u.length > 2048) return null;
  try {
    const p = new URL(u.trim());
    return p.protocol === "https:" || p.protocol === "http:" ? p.toString() : null;
  } catch {
    return null;
  }
}
/** tel: bağlantısı için yalnızca rakam, +, boşluksuz biçim. Geçersizse null. */
export function safeTel(p: unknown): string | null {
  if (typeof p !== "string") return null;
  const d = p.replace(/[\s().-]/g, "");
  return /^\+?\d{3,20}$/.test(d) ? `tel:${d}` : null;
}
