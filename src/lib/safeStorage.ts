// WebView'da localStorage erişimi hata verebilir (kısıtlı/özel depolama, kota). Bu çağrılar uygulamayı ASLA çökertmemeli:
// React'te effect içinde fırlayan hata kökü söker ve kullanıcı sonsuz boş ekran görür.
export function safeGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
export function safeSet(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* kalıcılık yok; uygulama çalışmaya devam eder */ }
}
