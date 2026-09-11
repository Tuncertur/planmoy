import { useEffect, useState } from "react";
import { CalendarDays, Check, MapPin, Share2, Users, X } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/useSession";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/routes/events.$token.tsx dosyasından taşınmıştır.
// Etkinlikler'deki "bağlantıyı kopyala" linkinin gittiği, hesapsız da
// görülebilen genel davet sayfası — daha önce hiç kurulmamıştı, link kırıktı.

type EventRow = { id: string; title: string; kind: string; description: string | null; location: string; starts_at: string };
type Participant = { display_name: string; status: string };

export function EventRsvpScreen() {
  const { token } = useParams();
  const { session } = useSession();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [notFoundState, setNotFoundState] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: ev } = await supabase.from("events").select("*").eq("share_token", token).maybeSingle();
    if (!ev) {
      setNotFoundState(true);
      return;
    }
    setEvent(ev);
    const { data: parts } = await supabase.from("event_participants").select("display_name, status").eq("event_id", ev.id);
    setParticipants(parts ?? []);
  }

  useEffect(() => {
    load();
  }, [token]);

  async function respond(status: "coming" | "not_coming") {
    if (!session || !event) {
      setMessage(tt({ tr: "Yanıtlamak için Planmoy hesabınla giriş yapmalısın.", en: "You need to sign in with your Planmoy account to respond." }));
      return;
    }
    setBusy(true);
    const displayName = session.user.email?.split("@")[0] ?? "Katılımcı";
    const { error } = await supabase
      .from("event_participants")
      .upsert({ event_id: event.id, user_id: session.user.id, display_name: displayName, status }, { onConflict: "event_id,user_id" });
    setBusy(false);
    setMessage(error ? tt({ tr: "Yanıt kaydedilemedi.", en: "Couldn't save your response." }) : tt({ tr: "Yanıtın kaydedildi.", en: "Your response was saved." }));
    if (!error) load();
  }

  if (notFoundState) {
    return (
      <div className="shared-event-page">
        <Link to="/" className="brand shared-brand">
          plan<span>moy</span>
          <i />
        </Link>
        <div className="shared-missing">
          <X size={30} />
          <h1>{tt({ tr: "Bu davet bulunamadı.", en: "This invite wasn't found." })}</h1>
          <Link to="/" className="primary-button">
            {tt({ tr: "Ana sayfaya dön", en: "Back to home" })}
          </Link>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="shared-event-page">
        <p>{tt({ tr: "Etkinlik hazırlanıyor…", en: "Preparing the event…" })}</p>
      </div>
    );
  }

  const going = participants.filter((p) => p.status === "coming");
  const pending = participants.filter((p) => p.status === "pending");

  return (
    <div className="shared-event-page">
      <header className="shared-header">
        <Link to="/" className="brand shared-brand">
          plan<span>moy</span>
          <i />
        </Link>
        <span>Planmoy Social</span>
      </header>
      <main className="shared-wrap">
        <section className="shared-hero">
          <div>
            <span className="event-kind">{event.kind}</span>
            <h1>{event.title}</h1>
            <p>{event.description || tt({ tr: "Bu etkinliğin tüm detayları burada. Kimlerin geleceğini birlikte takip edin.", en: "All the details for this event are here. Track who's coming together." })}</p>
          </div>
          <div className="shared-mark">
            <Share2 size={28} />
            <span>
              YOU ARE
              <br />
              INVITED
            </span>
          </div>
        </section>
        <section className="shared-grid">
          <article className="shared-detail-card">
            <p>
              <CalendarDays size={18} />
              <span>
                <small>{tt({ tr: "Tarih ve saat", en: "Date & time" })}</small>
                <b>{new Date(event.starts_at).toLocaleString("tr-TR", { dateStyle: "full", timeStyle: "short" })}</b>
              </span>
            </p>
            <p>
              <MapPin size={18} />
              <span>
                <small>{tt({ tr: "Genel konum", en: "General location" })}</small>
                <b>{event.location}</b>
              </span>
            </p>
            <div className="shared-actions">
              {session ? (
                <>
                  <button disabled={busy} className="primary-button" onClick={() => respond("coming")}>
                    <Check size={16} /> {tt({ tr: "Geliyorum", en: "I'm coming" })}
                  </button>
                  <button disabled={busy} className="secondary-button" onClick={() => respond("not_coming")}>
                    <X size={16} /> {tt({ tr: "Gelemiyorum", en: "Can't make it" })}
                  </button>
                </>
              ) : (
                <Link to="/" className="primary-button">
                  {tt({ tr: "Yanıtlamak için giriş yap", en: "Sign in to respond" })}
                </Link>
              )}
            </div>
            {message && (
              <p className="shared-message" role="status">
                {message}
              </p>
            )}
          </article>
          <article className="shared-attendees">
            <div className="attendees-head">
              <div>
                <p className="eyebrow blue-label">{tt({ tr: "KATILIM DURUMU", en: "RSVP STATUS" })}</p>
                <h2>{tt({ tr: "Kimler geliyor?", en: "Who's coming?" })}</h2>
              </div>
              <span>
                <Users size={14} /> {going.length}
              </span>
            </div>
            <div className="attendee-list">
              {going.map((p) => (
                <div className="attendee" key={p.display_name}>
                  <span className="attendee-avatar">{p.display_name.slice(0, 2).toUpperCase()}</span>
                  <b>{p.display_name}</b>
                  <em>{tt({ tr: "Geliyor", en: "Coming" })}</em>
                </div>
              ))}
              {pending.map((p) => (
                <div className="attendee pending" key={p.display_name}>
                  <span className="attendee-avatar">?</span>
                  <b>{p.display_name}</b>
                  <em>{tt({ tr: "Yanıt bekliyor", en: "Awaiting response" })}</em>
                </div>
              ))}
              {!going.length && !pending.length && <p className="empty-attendees">{tt({ tr: "Henüz katılımcı yok.", en: "No participants yet." })}</p>}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
