// Planmoy — Firebase Crashlytics entegrasyonu. Sadece native (iOS/Android)
// ortamda çalışır; web'de sessizce hiçbir şey yapmaz. Yakalanan JS
// hatalarını ve işlenmemiş promise reddedilmelerini otomatik bildirir.
import { Capacitor } from "@capacitor/core";

export async function initCrashReporting() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { FirebaseCrashlytics } = await import("@capacitor-firebase/crashlytics");
    window.addEventListener("error", (event) => {
      FirebaseCrashlytics.recordException({ message: event.message ?? "Unknown error" }).catch(() => {});
    });
    window.addEventListener("unhandledrejection", (event) => {
      const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
      FirebaseCrashlytics.recordException({ message }).catch(() => {});
    });
  } catch {
    // Eklenti henüz native tarafta kurulmadıysa sessizce geç.
  }
}
