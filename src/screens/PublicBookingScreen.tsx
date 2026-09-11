import { useEffect, useState } from "react";
import { ArrowLeft, CalendarCheck2, CheckCircle2, Clock3, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { findBlockedTerm } from "../lib/content-moderation";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/routes/book.tsx dosyasından taşınmıştır.
// FireVibe sürümü sabit bir demo işletmeye ("deniz-klinik") bağlıydı —
// burada gerçek işletme slug'ına göre çalışıyor: /book/:slug

const slots = ["09:30", "11:00", "14:30"];
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Config = { business: any; professional: any; service: any } | null;

export function PublicBookingScreen() {
  const { slug } = useParams();
  const [config, setConfig] = useState<Config>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "" });
  const [date, setDate] = useState(localToday);
  const [slot, setSlot] = useState("11:00");

  useEffect(() => {
    async function load() {
      const { data: business } = await supabase.from("businesses").select("*").eq("slug", slug).maybeSingle();
      if (!business) {
        setLoadFailed(true);
        return;
      }
      const { data: professional } = await supabase.from("professionals").select("*").eq("business_id", business.id).limit(1).maybeSingle();
      const { data: service } = await supabase.from("services").select("*").eq("business_id", business.id).limit(1).maybeSingle();
      if (!professional || !service) {
        setLoadFailed(true);
        return;
      }
      setConfig({ business, professional, service });
    }
    load();
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    if (findBlockedTerm(form.name)) {
      setError(tt({ tr: "Ad alanında uygun olmayan ifade kullanılamaz.", en: "The name field can't contain inappropriate language." }));
      return;
    }
    setLoading(true);
    setError("");
    const startsAt = new Date(`${date}T${slot}:00`);
    const endsAt = new Date(startsAt.getTime() + config.service.duration_minutes * 60000);
    const { error: insertError } = await supabase.from("appointments").insert({
      business_id: config.business.id,
      professional_id: config.professional.id,
      service_id: config.service.id,
      customer_name: form.name,
      customer_email: form.email,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "pending",
    });
    setLoading(false);
    if (insertError) {
      setError(
        insertError.message.includes("no_overlapping")
          ? tt({ tr: "Bu saat artık uygun değil, başka bir saat seç.", en: "That time is no longer available, pick another." })
          : tt({ tr: "Randevu oluşturulamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.", en: "Couldn't create the appointment. Please check your details and try again." })
      );
      return;
    }
    setSent(true);
  }

  return (
    <div className="space-auth" style={{ minHeight: "100vh", padding: "28px 5vw" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Link to="/" className="brand" style={{ fontSize: 24 }}>
          plan<span>moy</span>
          <i />
        </Link>
        <div style={{ marginTop: 48, display: "grid", gap: 40, gridTemplateColumns: "0.8fr 1.2fr", alignItems: "start" }}>
          <div>
            <Link to="/" className="back-link">
              <ArrowLeft size={14} /> {tt({ tr: "Genel bakış", en: "Overview" })}
            </Link>
            <p className="eyebrow blue-label">{config ? `${config.business.name} · ${config.business.city}` : tt({ tr: "RANDEVU AKIŞI", en: "BOOKING FLOW" })}</p>
            <h1 style={{ marginTop: 12, fontSize: 38, fontWeight: 800, letterSpacing: "-.05em" }}>
              {tt({ tr: "Randevunu", en: "Plan your" })}
              <br />
              {tt({ tr: "kolayca planla.", en: "appointment easily." })}
            </h1>
            <p style={{ marginTop: 18, maxWidth: 340, fontSize: 13, lineHeight: 1.6, color: "var(--color-mist-500)" }}>
              {tt({ tr: "Uygun zamanı seç, bilgilerini bırak. İşletme onayını e-posta ile paylaşalım.", en: "Pick an available time and leave your details. We'll share the business's confirmation by email." })}
            </p>
            {config && (
              <div style={{ marginTop: 36, display: "grid", gap: 12, fontSize: 12, color: "var(--color-mist-500)" }}>
                <p style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Clock3 size={17} /> {config.service.duration_minutes} {tt({ tr: "dakikalık görüşme", en: "minute session" })}
                </p>
                <p style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <UserRound size={17} /> {config.professional.name}
                </p>
              </div>
            )}
          </div>

          <div className="panel" style={{ padding: 28 }}>
            {loadFailed ? (
              <div style={{ padding: "60px 0", textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 700 }}>{tt({ tr: "Bu rezervasyon bağlantısı geçerli değil.", en: "This booking link isn't valid." })}</p>
                <Link to="/" className="primary-button" style={{ marginTop: 24, display: "inline-flex" }}>
                  {tt({ tr: "Ana sayfaya dön", en: "Back to home" })}
                </Link>
              </div>
            ) : !config ? (
              <p style={{ padding: "60px 0", textAlign: "center", fontSize: 13, color: "var(--color-mist-500)" }}>
                {tt({ tr: "Rezervasyon alanı hazırlanıyor…", en: "Preparing the booking form…" })}
              </p>
            ) : sent ? (
              <div style={{ padding: "50px 0", textAlign: "center" }}>
                <CheckCircle2 size={52} style={{ margin: "0 auto", color: "#3fbd7e" }} />
                <h2 style={{ marginTop: 18, fontSize: 24, fontWeight: 800 }}>{tt({ tr: "Talebin alındı.", en: "Your request was received." })}</h2>
                <p style={{ margin: "12px auto 0", maxWidth: 280, fontSize: 13, lineHeight: 1.6, color: "var(--color-mist-500)" }}>
                  {tt({ tr: "İşletme onayını", en: "The business will send confirmation to" })} <b>{form.email}</b> {tt({ tr: "adresine gönderecek.", en: "" })}
                </p>
                <Link to="/" className="primary-button" style={{ marginTop: 26, display: "inline-flex" }}>
                  {tt({ tr: "Ana sayfaya dön", en: "Back to home" })}
                </Link>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h2 style={{ fontSize: 17, fontWeight: 800 }}>{tt({ tr: "Randevu detayları", en: "Appointment details" })}</h2>
                <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
                  <label className="field-label">
                    {tt({ tr: "Hizmet", en: "Service" })}
                    <select disabled style={{ marginTop: 6 }}>
                      <option>
                        {config.service.name} · {config.service.duration_minutes} {tt({ tr: "dk", en: "min" })}
                      </option>
                    </select>
                  </label>
                  <label className="field-label">
                    {tt({ tr: "Tarih", en: "Date" })}
                    <input required type="date" min={localToday()} value={date} onChange={(e) => setDate(e.target.value)} />
                  </label>
                  <div>
                    <p className="field-label">{tt({ tr: "Uygun saat", en: "Available time" })}</p>
                    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {slots.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setSlot(item)}
                          aria-pressed={slot === item}
                          className={slot === item ? "selected" : ""}
                          style={{ height: 44, borderRadius: 8, border: "1px solid #cddfed", fontSize: 13, fontWeight: 700 }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="field-label">
                    {tt({ tr: "Ad soyad", en: "Full name" })}
                    <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </label>
                  <label className="field-label">
                    {tt({ tr: "E-posta", en: "Email" })}
                    <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </label>
                </div>
                {error && (
                  <div className="form-error" style={{ marginTop: 16 }} role="alert">
                    <p>{error}</p>
                  </div>
                )}
                <button disabled={loading} className="primary-button" style={{ marginTop: 28, width: "100%", display: "flex", justifyContent: "center", gap: 8 }}>
                  {loading ? tt({ tr: "Gönderiliyor…", en: "Sending…" }) : <>{tt({ tr: "Randevu talebi gönder", en: "Send booking request" })} <CalendarCheck2 size={17} /></>}
                </button>
                <p style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: "var(--color-mist-500)" }}>
                  {tt({ tr: "Ödeme alınmaz. İşletme onayı beklenir.", en: "No payment is taken. The business will confirm." })}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
