import { useEffect } from "react";
import { ExternalLink, Globe2, Info, MapPin, Phone, RefreshCw, Star } from "lucide-react";
import { useLocationSource } from "../lib/useLocationSource";
import { useTravelData, type TravelPlace } from "../lib/useTravelData";
import { tt } from "../lib/i18n";

// Oteller / Restoranlar / Gezilecek Yerler — üçü de TEK bir sorgudan
// (useTravelData önbelleği) beslenir. Google'ın herkese açık işletme
// verisi gösterilir; Planmoy bu bilgilerin güncelliğini/doğruluğunu
// garanti etmez, her zaman kaynağı (Google Maps) doğrulamanı öneririz.

export function TravelPlacesScreen({ userId, category, title }: { userId: string; category: "hotel" | "restaurant" | "places"; title: string }) {
  const location = useLocationSource(userId);
  const { places, status, refresh } = useTravelData(category, location);

  useEffect(() => {
    if (location.activeSource === "none") return;
  }, [location.activeSource]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-[var(--color-mist-300)]">
          {tt({
            tr: "Bu liste Google'ın herkese açık işletme verisinden gelir ve uygulama açıldığında ya da yeni bir tatil planı oluşturduğunda otomatik yenilenir.",
            en: "This list comes from Google's public business data and refreshes automatically when the app opens or you create a new trip plan.",
          })}
        </p>
        <button onClick={refresh} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs" disabled={status === "loading"}>
          <RefreshCw size={13} className={status === "loading" ? "animate-spin" : ""} /> {tt({ tr: "Yenile", en: "Refresh" })}
        </button>
      </div>

      {location.activeSource === "none" && (
        <div className="orbit-card p-4 text-sm">
          {tt({
            tr: "Önce Keşfet veya İlgi Alanlarım sayfasından adresini gir — buradaki liste o konuma göre gelir.",
            en: "First enter your address in Discover or My Interests — this list is based on that location.",
          })}
        </div>
      )}

      {status === "missing-key" && (
        <div className="orbit-card flex items-start gap-3 p-4 text-sm">
          <Info size={18} className="mt-0.5 shrink-0 text-[var(--color-gold-400)]" />
          <p>{tt({ tr: "Google Places bağlantısı henüz eklenmedi.", en: "The Google Places connection isn't configured yet." })}</p>
        </div>
      )}

      {status === "loading" && <p className="text-sm text-[var(--color-mist-500)]">{tt({ tr: "Yükleniyor…", en: "Loading…" })}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {places.map((place: TravelPlace) => (
          <article key={place.id} className="orbit-card p-4">
            <h3 className="font-medium">{place.name}</h3>
            <p className="mt-1 flex items-start gap-1.5 text-xs text-[var(--color-mist-500)]">
              <MapPin size={12} className="mt-0.5 shrink-0" /> {place.address}
            </p>
            {place.phone && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-mist-500)]">
                <Phone size={12} /> {place.phone}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-mist-300)]">
              {place.rating !== null && (
                <span className="flex items-center gap-1">
                  <Star size={12} fill="currentColor" /> {place.rating.toFixed(1)} ({place.userRatingCount ?? 0})
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              {place.mapsUrl && (
                <a href={place.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--color-cyan-300)] hover:underline">
                  {tt({ tr: "Google Maps'te aç", en: "Open in Maps" })} <ExternalLink size={11} />
                </a>
              )}
              {place.websiteUrl && (
                <a href={place.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--color-cyan-300)] hover:underline">
                  {tt({ tr: "Web sitesi", en: "Website" })} <Globe2 size={11} />
                </a>
              )}
            </div>
          </article>
        ))}
        {status === "ready" && places.length === 0 && (
          <p className="text-sm text-[var(--color-mist-500)]">{tt({ tr: `Bu bölgede ${title.toLocaleLowerCase("tr")} bulunamadı.`, en: `No ${title.toLowerCase()} found in this area.` })}</p>
        )}
      </div>

      <p className="text-[10px] text-[var(--color-mist-500)]">
        {tt({
          tr: "Bilgiler Google Places verisinden alınır, Planmoy içerik doğruluğundan sorumlu değildir. Rezervasyon/iletişim öncesi işletmeyi kendi kaynağından teyit et.",
          en: "Information comes from Google Places data; Planmoy is not responsible for its accuracy. Please verify with the business directly before booking or contacting them.",
        })}
      </p>
    </div>
  );
}
