import { useEffect, useState } from "react";
import { Check, Clock, Pill, Plus, SkipForward, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";

type Medication = { id: string; name: string; dosage: string | null; times: string[]; active: boolean };

export function MedicationsScreen({ userId }: { userId: string }) {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [todayLogs, setTodayLogs] = useState<Record<string, "taken" | "missed" | "skipped">>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("medications").select("id, name, dosage, times, active").eq("user_id", userId).eq("active", true).order("created_at");
    setMeds(data ?? []);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: logs } = await supabase.from("medication_logs").select("medication_id, scheduled_for, status").eq("user_id", userId).gte("scheduled_for", todayStart.toISOString());
    const map: Record<string, "taken" | "missed" | "skipped"> = {};
    (logs ?? []).forEach((l) => {
      const key = `${l.medication_id}|${new Date(l.scheduled_for).toTimeString().slice(0, 5)}`;
      map[key] = l.status as any;
    });
    setTodayLogs(map);
  }

  useEffect(() => {
    load();
  }, [userId]);

  async function addMedication(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || times.length === 0) return;
    setBusy(true);
    await supabase.from("medications").insert({ user_id: userId, name: name.trim(), dosage: dosage.trim() || null, times, days_of_week: [0, 1, 2, 3, 4, 5, 6] });
    setBusy(false);
    setName("");
    setDosage("");
    setTimes(["09:00"]);
    load();
  }

  async function removeMedication(id: string) {
    await supabase.from("medications").update({ active: false }).eq("id", id);
    load();
  }

  async function logDose(medicationId: string, time: string, status: "taken" | "missed" | "skipped") {
    const [h, m] = time.split(":").map(Number);
    const scheduledFor = new Date();
    scheduledFor.setHours(h, m, 0, 0);
    await supabase.from("medication_logs").insert({ medication_id: medicationId, user_id: userId, scheduled_for: scheduledFor.toISOString(), status });
    setTodayLogs((v) => ({ ...v, [`${medicationId}|${time}`]: status }));
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-xl text-sm leading-relaxed text-[var(--color-mist-300)]">
        {tt({ tr: "İlaçlarını ekle, günlük saatlerini belirle — her doz zamanı geldiğinde burada işaretleyebilirsin.", en: "Add your medications and set daily times." })}
      </p>

      <form onSubmit={addMedication} className="stacked-form orbit-card p-4" style={{ maxWidth: 420 }}>
        <label>
          {tt({ tr: "İlaç adı", en: "Medication name" })}
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={tt({ tr: "Örn. B12 vitamini", en: "e.g. Vitamin B12" })} />
        </label>
        <label>
          {tt({ tr: "Dozaj (isteğe bağlı)", en: "Dosage (optional)" })}
          <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder={tt({ tr: "Örn. 1 tablet", en: "e.g. 1 tablet" })} />
        </label>
        <label>
          {tt({ tr: "Saat(ler)", en: "Time(s)" })}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {times.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 6 }}>
                <input type="time" value={t} onChange={(e) => setTimes((v) => v.map((x, idx) => (idx === i ? e.target.value : x)))} />
                {times.length > 1 && (
                  <button type="button" onClick={() => setTimes((v) => v.filter((_, idx) => idx !== i))} className="danger-button" style={{ padding: "4px 8px" }}>
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setTimes((v) => [...v, "12:00"])} className="secondary-button" style={{ width: "fit-content" }}>
              <Plus size={13} /> {tt({ tr: "Saat ekle", en: "Add time" })}
            </button>
          </div>
        </label>
        <button className="primary-button" disabled={busy}>
          <Pill size={15} /> {tt({ tr: "İlacı ekle", en: "Add medication" })}
        </button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {meds.map((med) => (
          <div key={med.id} className="orbit-card p-4">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <Pill size={15} /> {med.name}
                </p>
                {med.dosage && <p style={{ fontSize: 12, color: "var(--color-mist-500)" }}>{med.dosage}</p>}
              </div>
              <button onClick={() => removeMedication(med.id)} className="danger-button" style={{ padding: "6px 10px" }}>
                <Trash2 size={13} />
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {med.times.map((t) => {
                const status = todayLogs[`${med.id}|${t}`];
                return (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 10, border: "1px solid var(--color-mist-500)", opacity: status ? 0.6 : 1 }}>
                    <Clock size={12} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{t}</span>
                    {status ? (
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{status === "taken" ? "✓" : status === "skipped" ? "⏭" : "✗"}</span>
                    ) : (
                      <>
                        <button onClick={() => logDose(med.id, t, "taken")} style={{ background: "none", border: 0, cursor: "pointer" }}>
                          <Check size={14} color="#2e8b3f" />
                        </button>
                        <button onClick={() => logDose(med.id, t, "skipped")} style={{ background: "none", border: 0, cursor: "pointer" }}>
                          <SkipForward size={14} color="#c98a2c" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {meds.length === 0 && <p className="text-sm" style={{ color: "var(--color-mist-500)" }}>{tt({ tr: "Henüz ilaç eklemedin.", en: "No medications yet." })}</p>}
      </div>
    </div>
  );
}
