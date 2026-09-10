import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/routes/calendar.tsx dosyasından taşınmıştır.
const rows = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function CalendarScreen({ userId }: { userId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [reminders, setReminders] = useState<{ id: string; title: string; remind_at: string }[]>([]);
  const [appointments, setAppointments] = useState<{ id: string; customer_name: string; starts_at: string; status: string }[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const { data: rem } = await supabase.from("calendar_reminders").select("id, title, remind_at").order("remind_at", { ascending: true });
    setReminders(rem ?? []);
    const { data: appts } = await supabase.from("appointments").select("id, customer_name, starts_at, status").eq("owner_id", userId);
    setAppointments(appts ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!reminderTitle || !reminderAt) return;
    const { error } = await supabase.from("calendar_reminders").insert({ user_id: userId, title: reminderTitle, remind_at: new Date(reminderAt).toISOString() });
    setMessage(error ? tt({ tr: "Alarm eklenemedi.", en: "Couldn't add the reminder." }) : tt({ tr: "Alarm takvime eklendi.", en: "Reminder added to your calendar." }));
    if (!error) {
      setReminderTitle("");
      setReminderAt("");
      load();
    }
  }

  const days = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1 + weekOffset * 7);
    return dayNames.map((name, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return { name, number: date.getDate(), date };
    });
  }, [weekOffset]);

  return (
    <div className="module-heading compact" style={{ marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="eyebrow blue-label">{tt({ tr: "Takvim yönetimi", en: "Calendar management" })}</p>
          <h2>{tt({ tr: "Haftalık görünüm", en: "Weekly view" })}</h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setWeekOffset((v) => v - 1)} aria-label="Önceki hafta" className="secondary-button" style={{ padding: 8 }}><ChevronLeft size={16} /></button>
          <button onClick={() => setWeekOffset((v) => v + 1)} aria-label="Sonraki hafta" className="secondary-button" style={{ padding: 8 }}><ChevronRight size={16} /></button>
          <button onClick={() => setWeekOffset(0)} className="secondary-button">{tt({ tr: "Bugün", en: "Today" })}</button>
          <label className="business-search" style={{ display: "flex" }}>
            <Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tt({ tr: "Randevu ara", en: "Search appointments" })} />
          </label>
        </div>
      </div>

      <div className="orbit-card" style={{ marginTop: 16, overflowX: "auto" }}>
        <div style={{ minWidth: 720, display: "grid", gridTemplateColumns: "70px repeat(7, minmax(90px, 1fr))" }}>
          <div />
          {days.map((d) => (
            <div key={d.date.toISOString()} style={{ textAlign: "center", padding: 8, fontSize: 11, fontWeight: 700, borderBottom: "1px solid var(--color-space-600)" }}>
              {d.name} {d.number}
            </div>
          ))}
          {rows.map((time) => (
            <>
              <div key={time} style={{ padding: "8px 6px", fontSize: 10, color: "var(--color-mist-500)", borderTop: "1px solid var(--color-space-600)" }}>{time}</div>
              {days.map((d) => {
                const items = appointments.filter((a) => {
                  const dt = new Date(a.starts_at);
                  return dt.toDateString() === d.date.toDateString() && dt.getHours() === Number(time.slice(0, 2)) && a.customer_name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"));
                });
                return (
                  <div key={d.date.toISOString() + time} style={{ borderTop: "1px solid var(--color-space-600)", minHeight: 46, padding: 3 }}>
                    {items.map((a) => (
                      <div key={a.id} style={{ fontSize: 10, fontWeight: 700, background: "var(--color-cyan-400)/10", borderLeft: "3px solid var(--color-cyan-400)", padding: "2px 4px", borderRadius: 4 }}>
                        {a.customer_name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      <section className="panel calendar-reminder" style={{ marginTop: 18 }}>
        <div>
          <p className="eyebrow">{tt({ tr: "Hatırlatıcılar", en: "Reminders" })}</p>
          <h3>{tt({ tr: "Takvimine alarm kur", en: "Set an alarm on your calendar" })}</h3>
          <p style={{ fontSize: 11, color: "var(--color-mist-500)" }}>{tt({ tr: "Önemli işleri unutma.", en: "Never forget what matters." })}</p>
        </div>
        <form onSubmit={addReminder} className="wardrobe-form" style={{ maxWidth: 360 }}>
          <label>
            {tt({ tr: "Başlık", en: "Title" })}
            <input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} placeholder={tt({ tr: "Örn. doktor randevusu", en: "e.g. doctor's appointment" })} />
          </label>
          <label>
            {tt({ tr: "Tarih ve saat", en: "Date & time" })}
            <input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
          </label>
          <button className="primary-button"><Plus size={15} /> {tt({ tr: "Alarm ekle", en: "Add reminder" })}</button>
        </form>
        {message && <p className="suggestion">{message}</p>}
        {reminders.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {reminders.slice(0, 4).map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderTop: "1px solid var(--color-space-600)" }}>
                <span>{r.title}</span>
                <small>{new Date(r.remind_at).toLocaleString("tr-TR")}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
