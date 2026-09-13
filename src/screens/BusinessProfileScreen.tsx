import { useEffect, useState } from "react";
import { Building2, MapPin, Phone, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/routes/businesses.$slug.tsx dosyasından
// taşınmıştır (eski adıyla, güncellenmemiş "randevuflow" markası
// içeriyordu — o hatayı buraya taşımadık, Planmoy marka diliyle
// yazıldı). businesses tablosunda zaten herkese açık SELECT izni var.

type Business = { name: string; industry: string; city: string; address: string | null; phone: string | null; slug: string };

export function BusinessProfileScreen() {
  const { slug } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("businesses")
      .select("name, industry, city, address, phone, slug")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setNotFound(true);
        else setBusiness(data);
      });
  }, [slug]);

  if (notFound) {
    return (
      <div className="shared-event-page">
        <Link to="/" className="brand shared-brand">
          plan<span>moy</span>
          <i />
        </Link>
        <div className="shared-missing">
          <X size={30} />
          <h1>{tt({ tr: "Bu işletme bulunamadı.", en: "This business wasn't found." })}</h1>
          <Link to="/" className="primary-button">
            {tt({ tr: "Ana sayfaya dön", en: "Back to home" })}
          </Link>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="shared-event-page">
        <p>{tt({ tr: "Yükleniyor…", en: "Loading…" })}</p>
      </div>
    );
  }

  return (
    <div className="shared-event-page">
      <header className="shared-header">
        <Link to="/" className="brand shared-brand">
          plan<span>moy</span>
          <i />
        </Link>
        <span>Planmoy</span>
      </header>
      <main className="shared-wrap" style={{ maxWidth: 480 }}>
        <section className="shared-hero">
          <div>
            <span className="event-kind">{business.industry}</span>
            <h1>{business.name}</h1>
            <p>{business.city}</p>
          </div>
          <div className="shared-mark">
            <Building2 size={28} />
          </div>
        </section>
        <section className="shared-grid">
          <article className="shared-detail-card">
            {business.address && (
              <p>
                <MapPin size={18} />
                <span>
                  <small>{tt({ tr: "Adres", en: "Address" })}</small>
                  <b>{business.address}</b>
                </span>
              </p>
            )}
            {business.phone && (
              <p>
                <Phone size={18} />
                <span>
                  <small>{tt({ tr: "Telefon", en: "Phone" })}</small>
                  <b>{business.phone}</b>
                </span>
              </p>
            )}
            <Link to={`/book/${business.slug}`} className="primary-button" style={{ marginTop: 16 }}>
              {tt({ tr: "Randevu al", en: "Book an appointment" })}
            </Link>
          </article>
        </section>
      </main>
    </div>
  );
}