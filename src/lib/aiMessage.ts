import { tt } from "./i18n";
import { isNativeApp } from "./paddle";

/** AI isteği reddedilince kullanıcıya doğru ve dürüst mesaj. Mağaza uygulamasında (Apple 3.1.1) satın almaya yönlendirme YOKTUR. */
export function aiErrorMessage(reason: string | undefined, fallback?: string): string {
  switch (reason) {
    case "missing-key":
      return tt({ tr: "AI sağlayıcısı (Gemini) henüz yapılandırılmadı.", en: "AI provider (Gemini) isn't configured yet." });
    case "free-plan":
      return isNativeApp()
        ? tt({ tr: "Yapay zekâ önerileri bu hesapta kullanılamıyor.", en: "AI suggestions aren't available on this account." })
        : tt({ tr: "Yapay zekâ önerileri ücretli planlara dahildir. Takvim, görevler ve randevular ücretsiz devam eder.", en: "AI suggestions are included in paid plans. Calendar, tasks and appointments stay free." });
    case "query-limit":
    case "cost-cap":
      return tt({ tr: "Bu ayki yapay zekâ hakkın doldu; ay başında yenilenir.", en: "You've used this month's AI allowance; it resets at the start of the month." });
    case "duplicate":
      return tt({ tr: "Bu istek zaten işleniyor.", en: "This request is already being processed." });
    case "rate-limited":
      return tt({ tr: "Çok sık istek gönderdin; biraz bekleyip tekrar dene.", en: "Too many requests; wait a moment and try again." });
    case "busy":
    case "unavailable":
    case "provider-error":
      return fallback ?? tt({ tr: "Öneri şu an alınamıyor, biraz sonra tekrar dene.", en: "Suggestions are unavailable right now; try again shortly." });
    default:
      return fallback ?? tt({ tr: "Öneri alınamadı, tekrar dene.", en: "Couldn't get a suggestion, try again." });
  }
}
