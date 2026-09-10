import { useEffect, useState } from "react";
import { CalendarDays, Copy, MapPin, Plus, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/routes/events.tsx dosyasından taşınmıştır
// (8 dilli sürüm yerine bizim tt() TR/EN sistemimizle).
const kinds = ["Manikür", "Pedikür", "Piknik", "Mangal partisi", "Düğün", "Nişan", "Diğer"];

type EventItem = { id: string; title: string; kind: string; location: string; starts_at: string; share_token: string };

export function EventsScreen({ userId }: { userId: string }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState(kinds[0]);
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const { data } = await supabase.from("events").select("*").order("starts_at", { ascending: true });
    setEvents(data ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !startsAt) return;
    setBusy(true);
    const { error } = await supabase.from("events").insert({ owner_id: userId, title, kind, location, starts_at: new Date(startsAt).toISOString() });
    setBusy(false);
    setMessage(error ? tt({ tr: "Etkinlik oluşturulamadı.", en: "Couldn't create the event." }) : tt({ tr: "Etkinlik oluşturuldu.", en: "Event created." }));
    if (!error) {
      setTitle("");
      setLocation("");
      setStartsAt("");
      load();
    }
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/events/${token}`);
      setMessage(tt({ tr: "Bağlantı kopyalandı.", en: "Link copied." }));
    } catch {
      setMessage(tt({ tr: "Bağlantı kopyalanamadı.", en: "Couldn't copy the link." }));
    }
  }

  return (
    <div>
      <div className="module-heading compact">
        <p className="eyebrow blue-label">PLANMOY {tt({ tr: "ETKİNLİKLER", en: "EVENTS" })}</p>
        <h2>{tt({ tr: "Birlikte iyi vakit.", en: "Good times, together." })}</h2>
        <p>{tt({ tr: "Manikürden pikniğe, mangal partisinden düğüne… Etkinliğini seç, davetini gönder.", en: "From manicures to picnics, barbecues to weddings — choose an occasion and invite your people." })}</p>
      </div>

      <form onSubmit={create} className="wardrobe-form" style={{ maxWidth: 420, marginTop: 16 }}>
        <label>
          {tt({ tr: "Etkinlik adı", en: "Event name" })}
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          {tt({ tr: "Etkinlik türü", en: "Event type" })}
          <select value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map((k) => <option key={k}>{k}</option>)}</select>
        </label>
        <label>
          {tt({ tr: "Konum", en: "Location" })}
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label>
          {tt({ tr: "Tarih ve saat", en: "Date & time" })}
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </label>
        <button className="primary-button" disabled={busy}><Plus size={15} /> {tt({ tr: "Etkinliği yayınla", en: "Publish event" })}</button>
      </form>
      {message && <p className="suggestion">{message}</p>}

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginTop: 16 }}>
        {events.length === 0 && (
          <div className="orbit-card p-8" style={{ textAlign: "center" }}>
            <Sparkles size={22} className="mx-auto text-[var(--color-mist-500)]" />
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--color-mist-500)" }}>{tt({ tr: "Henüz etkinlik yok. Bir kategori seçip ilk ortak planını oluştur.", en: "No events yet. Pick a category and create your first shared plan." })}</p>
          </div>
        )}
        {events.map((ev) => (
          <article key={ev.id} className="orbit-card p-4">
            <p className="text-xs text-[var(--color-cyan-300)]">{ev.kind}</p>
            <h3 className="mt-1 font-medium">{ev.title}</h3>
            <p className="text-xs text-[var(--color-mist-500)] flex items-center gap-1 mt-1"><MapPin size={11} /> {ev.location}</p>
            <p className="text-xs text-[var(--color-mist-500)] flex items-center gap-1 mt-1"><CalendarDays size={11} /> {new Date(ev.starts_at).toLocaleString("tr-TR")}</p>
            <button onClick={() => copyLink(ev.share_token)} className="text-xs text-[var(--color-cyan-300)] inline-flex items-center gap-1 mt-2">
              <Copy size={12} /> {tt({ tr: "Bağlantıyı kopyala", en: "Copy link" })}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
