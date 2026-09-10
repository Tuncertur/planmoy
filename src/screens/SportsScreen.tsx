import { useState } from "react";
import { Bike, CircleDot, Dumbbell, ExternalLink, Globe2, Mountain, Newspaper, Trophy, Waves } from "lucide-react";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/routes/sports.tsx dosyasından birebir taşınmıştır
// — statik ülke/branş listesi ve Google News dış linkleri aynen korunuyor.
type Sport = { name: string; country: string; searches: string; icon: typeof Trophy; query: string };

const sports: Sport[] = [
  { name: "Futbol", country: "Türkiye", searches: "Süper Lig · milli takım · transfer", icon: Trophy, query: "Türkiye futbol haberleri" },
  { name: "Basketbol", country: "ABD", searches: "NBA · kolej ligi · playoff", icon: CircleDot, query: "USA basketball news" },
  { name: "Tenis", country: "Birleşik Krallık", searches: "Grand Slam · Wimbledon · sıralama", icon: Dumbbell, query: "UK tennis news Wimbledon" },
  { name: "Formula 1", country: "Almanya", searches: "yarış takvimi · pilotlar · sıralama", icon: Bike, query: "Germany Formula 1 news" },
  { name: "Bisiklet", country: "Fransa", searches: "Tour de France · yol bisikleti · etap", icon: Bike, query: "France cycling news Tour de France" },
  { name: "Sörf", country: "Avustralya", searches: "dalga · şampiyona · sahil", icon: Waves, query: "Australia surfing news" },
  { name: "Kayak", country: "Japonya", searches: "kış sporları · slalom · pist", icon: Mountain, query: "Japan skiing news" },
];

export function SportsScreen() {
  const [country, setCountry] = useState("Tümü");
  const countries = ["Tümü", ...Array.from(new Set(sports.map((s) => s.country)))];
  const visible = country === "Tümü" ? sports : sports.filter((s) => s.country === country);

  return (
    <div>
      <div className="module-heading compact">
        <p className="eyebrow blue-label">{tt({ tr: "Ülke · kategori · haber", en: "Country · category · news" })}</p>
        <h2>{tt({ tr: "Spor dünyasını", en: "Bring the sports world" })}<br /><em>{tt({ tr: "ritmine bağla.", en: "into your rhythm." })}</em></h2>
        <p>{tt({ tr: "Ülkelere göre öne çıkan başlıkları ve haber akışını takip et.", en: "Follow trending topics and news by country." })}</p>
      </div>

      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <p className="eyebrow">{tt({ tr: "Ülkeye göre branşlar", en: "Sports by country" })}</p>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
          {countries.map((c) => <option key={c}>{c}</option>)}
        </select>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" style={{ marginTop: 12 }}>
        {visible.map((sport) => {
          const Icon = sport.icon;
          return (
            <article className="orbit-card p-4" key={sport.name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, background: "var(--color-cyan-400)/12" }}>
                  <Icon size={20} className="text-[var(--color-cyan-300)]" />
                </span>
                <span style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4, color: "var(--color-mist-500)" }}>
                  <Globe2 size={11} /> {sport.country}
                </span>
              </div>
              <h3 style={{ marginTop: 10 }}>{sport.name}</h3>
              <p style={{ fontSize: 11, color: "var(--color-mist-500)" }}>{sport.searches}</p>
              <a href={`https://news.google.com/search?q=${encodeURIComponent(sport.query)}`} target="_blank" rel="noreferrer" className="text-xs text-[var(--color-cyan-300)] inline-flex items-center gap-1 mt-2">
                {tt({ tr: "Haberleri aç", en: "Open news" })} <ExternalLink size={12} />
              </a>
            </article>
          );
        })}
      </section>

      <section className="orbit-card p-4 mt-4" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Newspaper size={30} className="text-[var(--color-mist-500)]" />
        <div>
          <h3>{tt({ tr: "Başlıkları kaynağından takip et.", en: "Follow headlines at the source." })}</h3>
          <p style={{ fontSize: 11, color: "var(--color-mist-500)" }}>
            {tt({ tr: "Planmoy haberleri kendi içinde uydurmaz; her kart seni Google News aramasına götürür.", en: "Planmoy never fabricates news — every card links to a Google News search." })}
          </p>
        </div>
      </section>
    </div>
  );
}
