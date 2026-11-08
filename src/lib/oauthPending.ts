// Planmoy — OAuth dönüşü koruması: yalnızca BU cihazda başlatılmış bir girişin dönüşü kabul edilir.
// Aksi halde saldırganın hazırladığı com.planmoy.app://auth-callback#access_token=… bağlantısı kurbanı saldırganın hesabına geçirirdi.
// Tek kullanımlık ve kısa ömürlü işaret; saf fonksiyonlar (depolama dışarıdan verilir, test edilebilir).
export const OAUTH_PENDING_KEY = "planmoy.oauth.pending";
export const OAUTH_PENDING_TTL_MS = 10 * 60 * 1000;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function markOAuthPending(store: Store, now: number): void {
  try { store.setItem(OAUTH_PENDING_KEY, String(now)); } catch { /* depolama yoksa dönüş reddedilir (güvenli taraf) */ }
}

/** İşaret varsa ve süresi dolmamışsa true döner; her durumda işareti siler (tek kullanım). */
export function consumeOAuthPending(store: Store, now: number): boolean {
  let raw: string | null = null;
  try { raw = store.getItem(OAUTH_PENDING_KEY); store.removeItem(OAUTH_PENDING_KEY); } catch { return false; }
  const t = Number(raw);
  return Number.isFinite(t) && t > 0 && now >= t && now - t <= OAUTH_PENDING_TTL_MS;
}
