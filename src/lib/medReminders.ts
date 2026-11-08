// İlaç hatırlatıcıları — saf mantık (test edilir). Yerel bildirim planlaması medRemindersNative.ts'te.
export type MedLike = { id: string; name: string; dosage: string | null; times: string[]; active?: boolean };
export type ReminderSlot = { id: number; title: string; body: string; hour: number; minute: number };
export type ReminderLabels = { title: string; body: (name: string, dosage: string | null) => string };

const TIME_RE = /^(\d{2}):(\d{2})$/;
const MAX_BODY = 120;

/** İlaç + saat için kararlı, pozitif 31-bit bildirim kimliği (FNV-1a). */
export function reminderId(medId: string, time: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${medId}|${time}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 0x7fffffff || 1;
}

export function buildReminderSlots(meds: MedLike[], labels: ReminderLabels): ReminderSlot[] {
  const out: ReminderSlot[] = [];
  const seen = new Set<number>();
  for (const m of meds) {
    if (m.active === false) continue;
    for (const t of m.times ?? []) {
      const mt = TIME_RE.exec(t);
      if (!mt) continue;
      const hour = Number(mt[1]);
      const minute = Number(mt[2]);
      if (hour > 23 || minute > 59) continue;
      const id = reminderId(m.id, t);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, title: labels.title, body: labels.body(m.name, m.dosage).slice(0, MAX_BODY), hour, minute });
    }
  }
  return out;
}
