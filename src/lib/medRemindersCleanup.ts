// İlaç modülü 27.11.2026'da kaldırıldı (Tuncer kararı; MASTER-CHECKLIST H-06).
// Eski sürümün cihazda kurduğu ilaç bildirimleri ("kind: med") açılışta bir kez iptal edilir.
// Yalnızca yerel (Capacitor) uygulamada çalışır; web'de hiçbir şey yapmaz. Hata fırlatmaz.

type PendingLike = { id: number; extra?: unknown };

export function medNotificationIds(pending: PendingLike[]): { id: number }[] {
  return pending
    .filter((n) => (n.extra as { kind?: string } | undefined)?.kind === "med")
    .map((n) => ({ id: n.id }));
}

function isNative(): boolean {
  return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

export async function cancelLegacyMedReminders(): Promise<void> {
  if (typeof window === "undefined" || !isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    const ours = medNotificationIds(pending.notifications);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours });
  } catch (e) {
    console.warn("[planmoy] eski ilaç bildirimleri iptal edilemedi", e);
  }
}
