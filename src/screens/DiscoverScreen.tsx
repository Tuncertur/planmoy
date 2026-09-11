import { useEffect, useState } from "react";
import { Crosshair, Info, MapPin, Search, Star, ExternalLink } from "lucide-react";
import { getNearbyPlaces, isWeekendWindow, type NearbyPlace } from "../lib/discover";
import { useLocationSource } from "../lib/useLocationSource";
import { tt } from "../lib/i18n";

const categories = [
  "restaurant",
  "cafe",
  "bar",
  "cinema",
  "theater",
  "concert",
  "manicure",
  "pedicure",
  "massage",
  "sauna",
  "pool",
  "hammam",
  "haircut",
  "places",
] as const;

const categoryLabel: Record<(typeof categories)[number], { tr: string; en: string }> = {
  restaurant: { tr: "Restoran", en: "Restaurants" },
  cafe: { tr: "Kafe", en: "Cafes" },
  bar: { tr: "Bar", en: "Bars" },
  cinema: { tr: "Sinema", en: "Cinema" },
  theater: { tr: "Tiyatro", en: "Theater" },
  concert: { tr: "Konser & etkinlik", en: "Concerts & events" },
  manicure: { tr: "Manikür", en: "Manicure" },
  pedicure: { tr: "Pedikür", en: "Pedicure" },
  massage: { tr: "Masaj", en: "Massage" },
  sauna: { tr: "Sauna", en: "Sauna" },
  pool: { tr: "Havuz", en: "Pools" },
  hammam: { tr: "Hamam", en: "Hammams" },
  haircut: { tr: "Saç, stilist & berber", en: "Hair, stylists & barbers" },
  places: { tr: "Gezilecek yerler", en: "Places to visit" },
};

function formatDistance(meters: number) {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function DiscoverScreen({ userId }: { userId: string }) {
  const location = useLocationSource(userId);
  const [category, setCategory] = useState<(typeof categories)[number]>("restaurant");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "locating" | "loading" | "missing-key" | "provider-error" | "ready">("idle");
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [radiusKm, setRadiusKm] = useState(isWeekendWindow() ? 100 : 50);

  async function runSearch(cat: (typeof categories)[number]) {
    if (location.activeSource === "none") {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    const result = await getNearbyPlaces(
      location.activeSource === "manual"
        ? { address: location.manualAddress, category: cat, languageCode: "tr" }
        : { latitude: location.latitude!, longitude: location.longitude!, category: cat, languageCode: "tr" }
    );
    if (!result.ok) {
      setStatus(result.reason === "missing-key" ? "missing-key" : "provider-error");
      return;
    }
    setRadiusKm(result.radiusKm);
    setPlaces(result.places);
    setStatus("ready");
  }

  function locate() {
    setStatus("locating");
    location.useGps();
  }

  useEffect(() => {
    if (location.activeSource !== "none") runSearch(category);
  }, [location.activeSource]);

  async function searchWithManualAddress() {
    await location.saveManualAddress();
    runSearch(category);
  }

  const visible = places.filter((p) => `${p.name} ${p.address}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")));

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-xl text-sm leading-relaxed text-[var(--color-mist-300)]">
        {tt({
          tr: "Konumuna göre en yakın işletmeleri ve gezilecek yerleri keşfet. Hafta sonu (Cuma–Pazar) alan genişler.",
          en: "Discover nearby businesses and places to visit. The range expands on weekends (Fri–Sun).",
        })}
      </p>

      {/* Öncelik: önce elle girilen adres, GPS bazı ülkelerde yanlış konum
          gösterdiği için yalnızca elle adres YOKSA GPS'e başvurulur. */}
      <div className="orbit-card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
          <MapPin size={15} className="text-[var(--color-mist-500)]" />
          <input
            value={location.manualAddress}
            onChange={(e) => location.setManualAddress(e.target.value)}
            placeholder={tt({ tr: "Adresini yaz (örn. Kadıköy, İstanbul) — önceliklidir", en: "Type your address (e.g. downtown) — takes priority" })}
            className="w-full bg-transparent outline-none"
          />
        </label>
        <button onClick={searchWithManualAddress} className="rounded-xl bg-[var(--color-cyan-400)] px-4 py-2 text-sm font-medium text-[var(--color-space-950)]">
          {tt({ tr: "Bu adrese göre ara", en: "Search from this address" })}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
          <Search size={15} className="text-[var(--color-mist-500)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tt({ tr: "Mekan veya kategori ara", en: "Search places or categories" })}
            className="w-full bg-transparent outline-none"
          />
        </label>
        <button
          onClick={locate}
          disabled={status === "locating" || status === "loading"}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-60"
          title={tt({ tr: "Sadece elle adres girmediysen kullanılır", en: "Only used if you haven't typed an address" })}
        >
          <Crosshair size={15} />
          {status === "locating" ? tt({ tr: "Konum alınıyor…", en: "Getting location…" }) : tt({ tr: "Konumumu kullan (GPS)", en: "Use my location (GPS)" })}
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--color-mist-500)]">
        <MapPin size={13} />
        {radiusKm} km {tt({ tr: "arama yarıçapı", en: "search radius" })}
        <span className="text-[var(--color-cyan-300)]">
          · {isWeekendWindow() ? tt({ tr: "Cuma–Pazar", en: "Fri–Sun" }) : tt({ tr: "Hafta içi", en: "Weekday" })}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              if (location.activeSource !== "none") runSearch(c);
            }}
            className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
              category === c
                ? "bg-[var(--color-cyan-400)] text-[var(--color-space-950)]"
                : "border border-white/10 bg-white/5 text-[var(--color-mist-300)] hover:bg-white/10"
            }`}
          >
            {tt(categoryLabel[c])}
          </button>
        ))}
      </div>

      {status === "missing-key" && (
        <div className="orbit-card flex items-start gap-3 p-4 text-sm">
          <Info size={18} className="mt-0.5 shrink-0 text-[var(--color-gold-400)]" />
          <p>
            {tt({
              tr: "Google Places bağlantısı henüz eklenmedi. Gerçek işletme, mesafe ve Google yıldızlarını göstermek için GOOGLE_MAPS_API_KEY eklenmeli.",
              en: "The Google Places connection isn't configured yet. Add GOOGLE_MAPS_API_KEY to show real businesses, distances, and Google ratings.",
            })}
          </p>
        </div>
      )}
      {status === "idle" && (
        <div className="orbit-card flex flex-col items-center gap-3 p-8 text-center">
          <Crosshair size={24} className="text-[var(--color-mist-500)]" />
          <p className="text-sm text-[var(--color-mist-300)]">{tt({ tr: "Yakındaki önerileri görmek için konum izni verin.", en: "Allow location access to see nearby recommendations." })}</p>
        </div>
      )}
      {status === "ready" && visible.length === 0 && (
        <p className="text-sm text-[var(--color-mist-500)]">{tt({ tr: "Bu kategoride sonuç bulunamadı.", en: "No results in this category." })}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((place) => (
          <article key={place.id} className="orbit-card p-4">
            <p className="text-xs text-[var(--color-cyan-300)]">{tt(categoryLabel[category])}</p>
            <h3 className="mt-1 font-medium">{place.name}</h3>
            <p className="text-sm text-[var(--color-mist-500)]">{place.address}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-mist-300)]">
              {place.rating !== null && (
                <span className="flex items-center gap-1">
                  <Star size={12} fill="currentColor" /> {place.rating.toFixed(1)} ({place.userRatingCount ?? 0})
                </span>
              )}
              {place.distanceMeters !== null && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {formatDistance(place.distanceMeters)}
                </span>
              )}
            </div>
            {place.mapsUrl && (
              <a
                href={place.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-cyan-300)] hover:underline"
              >
                {tt({ tr: "Google Maps'te aç", en: "Open in Google Maps" })} <ExternalLink size={12} />
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
