import { useEffect, useState } from "react";
import { ExternalLink, Globe2, Info, MapPin, Phone, RefreshCw, Star } from "lucide-react";
import { useLocationSource } from "../lib/useLocationSource";
import { useTravelData, type TravelPlace } from "../lib/useTravelData";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";

const PRICE_RANK: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};
const PRICE_LABEL: Record<string, string> = {
  PRICE_LEVEL_FREE: "Ücretsiz",
  PRICE_LEVEL_INEXPENSIVE: "₺",
  PRICE_LEVEL_MODERATE: "₺₺",
  PRICE_LEVEL_EXPENSIVE: "₺₺₺",
  PRICE_LEVEL_VERY_EXPENSIVE: "₺₺₺₺",
};

// Kişiselleştir bölümündeki "otel" cevapları burada okunup varsayılan
// sıralamayı belirler (örn. "en uygun/ucuz" dediyse fiyata göre,
// aksi halde puana göre sıralanır) — kullanıcı istediği zaman elle de
// değiştirebilir.
export function TravelPlacesScreen({ userId, category, title }: { userId: string; category: "hotel" | "restaurant" | "places"; title: string }) {
  const location = useLocationSource(userId);
  const { places, status, refresh } = useTravelData(category, location);
  const [sortBy, setSortBy] = useState<"rating" | "price">("rating");

  useEffect(() => {
    if (category !== "hotel") return;
    supabase
      .from("user_interests")
      .select("name")
      .eq("user_id", userId)
      .eq("kind", "otel")
      .then(({ data }) => {
        const text = (data ?? []).map((i) => i.name).join(" ").toLocaleLowerCase("tr");
        if (/ucuz|uygun|ekonomik/.test(text)) setSortBy("price");
      });
  }, [category, userId]);

  const sorted = [...places].sort((a: TravelPlace, b: TravelPlace) => {
    if (sortBy === "price") {
      const pa = a.priceLevel ? PRICE_RANK[a.priceLevel] ?? 99 : 99;
      const pb = b.priceLevel ? PRICE_RANK[b.priceLevel] ?? 99 : 99;
      return pa - pb;
    }
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

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

      {category === "hotel" && places.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy("rating")}
            className={`rounded-xl px-3 py-1.5 text-xs ${sortBy === "rating" ? "bg-[var(--color-cyan-400)] text-[var(--color-space-950)]" : "border border-white/10 bg-white/5"}`}
          >
            {tt({ tr: "Puana göre", en: "By rating" })}
          </button>
          <button
            onClick={() => setSortBy("price")}
            className={`rounded-xl px-3 py-1.5 text-xs ${sortBy === "price" ? "bg-[var(--color-cyan-400)] text-[var(--color-space-950)]" : "border border-white/10 bg-white/5"}`}
          >
            {tt({ tr: "Fiyata göre (uygundan)", en: "By price (cheapest first)" })}
          </button>
        </div>
      )}

      {location.activeSource === "none" && (
        <div className="orbit-card p-4 text-sm">
          {tt({
            tr: "Üst bardaki konum kutusundan (📍) şehrini seç ya da GPS'e izin ver — buradaki liste o konuma göre gelir.",
            en: "Set your city from the location box in the top bar (📍) or allow GPS — this list is based on that location.",
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
        {sorted.map((place: TravelPlace) => (
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
              {place.priceLevel && PRICE_LABEL[place.priceLevel] && <span>{PRICE_LABEL[place.priceLevel]}</span>}
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
