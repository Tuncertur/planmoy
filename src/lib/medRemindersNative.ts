// Yalnızca yerel (Capacitor) uygulamada çalışır; web'de hiçbir şey yapmaz. Eklenti dinamik yüklenir.
import { buildReminderSlots, type MedLike, type ReminderLabels } from "./medReminders";

function isNative(): boolean {
  return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

/** Bu cihazdaki tüm ilaç bildirimlerini yeniden kurar (eskiler iptal edilir). Hata fırlatmaz. */
export async function syncMedReminders(meds: MedLike[], labels: ReminderLabels): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => (n.extra as { kind?: string } | undefined)?.kind === "med").map((n) => ({ id: n.id }));
    if (ours.length) await LocalNotifications.cancel({ notifications: ours });
    const slots = buildReminderSlots(meds, labels);
    if (slots.length === 0) return;
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return;
    await LocalNotifications.schedule({
      notifications: slots.map((s) => ({
        id: s.id,
        title: s.title,
        body: s.body,
        schedule: { on: { hour: s.hour, minute: s.minute }, allowWhileIdle: true },
        extra: { kind: "med" },
      })),
    });
  } catch (e) {
    console.warn("ilaç bildirimleri kurulamadı", e);
  }
}
