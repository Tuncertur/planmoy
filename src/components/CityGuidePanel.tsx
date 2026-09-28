import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Info, MapPin, Sparkles } from "lucide-react";
import { CITIES, KIND_LABEL, findCityByText, mapsSearchUrl, nearestCity, type GuideCity } from "../lib/cityGuide";
import { useLocationSource } from "../lib/useLocationSource";
import { tt } from "../lib/i18n";

// Ücretsiz plan için içerik: uygulamanın KENDİ şehir rehberi (API maliyeti yok).
// Canlı Google verisi (yakındaki otel/restoran, puan, telefon) ücretli planda.
export type GuideMode = "places" | "hotel" | "restaurant" | "discover";

export function resolveGuideCity(location: ReturnType<typeof useLocationSource>): GuideCity | null {
  if (location.activeSource === "manual") return findCityByText(location.savedManualAddress);
  if (location.activeSource === "gps" && location.latitude !== null && location.longitude !== null) {
    return nearestCity(location.latitude, location.longitude);
  }
  return null;
}

export function UpgradeCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="orbit-card flex items-start gap-3 p-4 text-sm" data-testid="upgrade-card">
      <Sparkles size={18} className="mt-0.5 shrink-0 text-[var(--color-gold-400)]" />
      <div className="flex flex-col gap-2">
        <p>
          {compact
            ? tt({ tr: "Yakındaki canlı öneriler, Google puanları ve telefon numaraları ücretli planda.", en: "Live nearby suggestions, Google ratings and phone numbers are on paid plans." })
            : tt({
                tr: "Yakınındaki canlı otel, restoran ve mekân önerilerini (puan, telefon, mesafe) görmek için planını yükselt. Şehir rehberi ücretsiz kalır.",
                en: "Upgrade to see live nearby hotels, restaurants and places (ratings, phone, distance). The city guide stays free.",
              })}
        </p>
        <Link to="/pricing" className="primary-button w-fit text-sm">
          {tt({ tr: "Planları gör", en: "See plans" })}
        </Link>
      </div>
    </div>
  );
}

export function CityGuidePanel({ userId, mode }: { userId: string; mode: GuideMode }) {
  const location = useLocationSource(userId);
  const auto = resolveGuideCity(location);
  const [overrideId, setOverrideId] = useState<string | null>(null);

  // Konum (adres ya da GPS) değişince elle seçilen şehri bırak, yeni konumu izle.
  useEffect(() => {
    setOverrideId(null);
  }, [location.savedManualAddress, location.latitude, location.longitude, location.activeSource]);

  const city = (overrideId && CITIES.find((c) => c.id === overrideId)) || auto;

  const picker = (
    <label className="flex items-center gap-2 text-xs text-[var(--color-mist-500)]">
      <MapPin size={13} />
      <select
        aria-label={tt({ tr: "Rehber şehri", en: "Guide city" })}
        value={city?.id ?? ""}
        onChange={(e) => setOverrideId(e.target.value || null)}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
      >
        {!city && <option value="">{tt({ tr: "Şehir seç…", en: "Choose a city…" })}</option>}
        {CITIES.map((c) => (
          <option key={c.id} value={c.id}>
            {tt(c.name)} · {tt(c.country)}
          </option>
        ))}
      </select>
    </label>
  );

  if (mode === "hotel" || mode === "restaurant") {
    const noun = mode === "hotel" ? { tr: "otelleri", en: "hotels" } : { tr: "restoranları", en: "restaurants" };
    const q = `${mode === "hotel" ? "hotels" : "restaurants"} ${city?.mapsName ?? ""}`.trim();
    return (
      <div className="flex flex-col gap-4" data-testid="guide-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-[var(--color-mist-300)]">
            {tt({
              tr: "Canlı öneriler (puan, telefon, mesafe) ücretli planda. Şimdilik Haritalar'da aratabilirsin.",
              en: "Live suggestions (ratings, phone, distance) are on paid plans. For now you can search on Maps.",
            })}
          </p>
          {picker}
        </div>
        {city ? (
          <a href={mapsSearchUrl(q)} target="_blank" rel="noopener noreferrer" className="secondary-button w-fit text-sm">
            <ExternalLink size={14} /> {tt({ tr: `Haritalar'da ${tt(city.name)} ${tt(noun)} ara`, en: `Search ${tt(noun)} in ${tt(city.name)} on Maps` })}
          </a>
        ) : (
          <div className="orbit-card flex items-start gap-3 p-4 text-sm">
            <Info size={18} className="mt-0.5 shrink-0 text-[var(--color-gold-400)]" />
            <p>{tt({ tr: "Şehrini üst bardaki konum kutusundan seç ya da yukarıdan bir şehir seç.", en: "Set your city in the top bar location box or pick a city above." })}</p>
          </div>
        )}
        <UpgradeCard />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="guide-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm leading-relaxed text-[var(--color-mist-300)]">
          {mode === "discover"
            ? tt({
                tr: "Canlı yakın çevre araması ücretli planda. Şimdilik şehir rehberinin öne çıkan yerlerine göz at.",
                en: "Live nearby search is on paid plans. For now, browse the city guide's highlights.",
              })
            : tt({
                tr: "Şehrinin öne çıkan gezilecek yerleri — ücretsiz şehir rehberi.",
                en: "Your city's must-see places — the free city guide.",
              })}
        </p>
        {picker}
      </div>

      {!city && (
        <div className="orbit-card flex items-start gap-3 p-4 text-sm" data-testid="guide-nocity">
          <Info size={18} className="mt-0.5 shrink-0 text-[var(--color-gold-400)]" />
          <p>
            {tt({
              tr: "Bu konum için henüz bir rehberimiz yok. Yukarıdan rehberi olan bir şehir seçebilirsin.",
              en: "We don't have a guide for this location yet. Pick a city with a guide above.",
            })}
          </p>
        </div>
      )}

      {city && (
        <>
          <h2 className="text-lg font-semibold" data-testid="guide-city">
            {tt(city.name)} <span className="text-sm font-normal text-[var(--color-mist-500)]">· {tt(city.country)}</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {city.places.map((p) => (
              <article key={p.query} className="orbit-card flex flex-col gap-2 p-4" data-testid="guide-place">
                <span className="w-fit rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "#ece8ff", color: "#5b4fc4" }}>{tt(KIND_LABEL[p.kind])}</span>
                <h3 className="font-medium">{tt(p.name)}</h3>
                <p className="text-sm text-[var(--color-mist-300)]">{tt(p.desc)}</p>
                <a
                  href={mapsSearchUrl(`${p.query} ${city.mapsName}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto flex w-fit items-center gap-1.5 text-xs text-[var(--color-cyan-300)]"
                >
                  <ExternalLink size={12} /> {tt({ tr: "Haritada aç", en: "Open in Maps" })}
                </a>
              </article>
            ))}
          </div>
          <p className="flex items-start gap-2 text-xs text-[var(--color-mist-500)]">
            <Info size={13} className="mt-0.5 shrink-0" />
            {tt({
              tr: "Rehber genel bilgi amaçlıdır. Çalışma saati, bilet ve fiyat için “Haritada aç” bağlantısından güncel bilgiye bak.",
              en: "The guide is for general information. For opening hours, tickets and prices, check current details via “Open in Maps”.",
            })}
          </p>
        </>
      )}

      <UpgradeCard compact />
    </div>
  );
}
