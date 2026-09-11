import { useEffect, useState } from "react";
import { AlertTriangle, MapPin, Sparkles, UserRound, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";

type SharedProfile = { nickname: string; age: number; gender: "kadin" | "erkek"; plans: string | null; places: string | null; interests: string[] };

export function ProfileViewScreen() {
  const { token } = useParams();
  const [profile, setProfile] = useState<SharedProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase.functions.invoke("get-shared-profile", { body: { token } }).then(({ data, error }) => {
      if (error || !data?.ok) {
        setNotFound(true);
        return;
      }
      setProfile(data.profile);
    });
  }, [token]);

  if (notFound) {
    return (
      <div className="shared-event-page">
        <Link to="/" className="brand shared-brand">
          plan<span>moy</span>
          <i />
        </Link>
        <div className="shared-missing">
          <X size={30} />
          <h1>{tt({ tr: "Bu profil bulunamadı veya kapatılmış.", en: "This profile wasn't found or was deactivated." })}</h1>
          <Link to="/" className="primary-button">
            {tt({ tr: "Ana sayfaya dön", en: "Back to home" })}
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
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
            <span className="event-kind">{profile.gender === "kadin" ? tt({ tr: "Kadın", en: "Woman" }) : tt({ tr: "Erkek", en: "Man" })} · {profile.age}</span>
            <h1>{profile.nickname}</h1>
            {profile.plans && <p>{profile.plans}</p>}
          </div>
          <div className="shared-mark">
            <UserRound size={28} />
          </div>
        </section>
        <section className="shared-grid">
          <article className="shared-detail-card">
            {profile.places && (
              <p>
                <MapPin size={18} />
                <span>
                  <small>{tt({ tr: "Gitmeyi planladığı yerler", en: "Places planning to go" })}</small>
                  <b>{profile.places}</b>
                </span>
              </p>
            )}
            {profile.interests.length > 0 && (
              <p>
                <Sparkles size={18} />
                <span>
                  <small>{tt({ tr: "İlgi alanları", en: "Interests" })}</small>
                  <b>{profile.interests.join(", ")}</b>
                </span>
              </p>
            )}
          </article>
        </section>
        <div className="orbit-card flex items-start gap-3 p-3" style={{ marginTop: 16 }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-mist-500)]" />
          <p className="text-[10px] text-[var(--color-mist-500)]">
            {tt({
              tr: "Planmoy bu profilin kimliğini veya yaşını doğrulamaz. İlk buluşmaları herkese açık bir yerde yap, nereye gittiğini güvendiğin birine söyle.",
              en: "Planmoy does not verify this profile's identity or age. Meet for the first time in a public place, and tell someone you trust where you're going.",
            })}
          </p>
        </div>
      </main>
    </div>
  );
}
