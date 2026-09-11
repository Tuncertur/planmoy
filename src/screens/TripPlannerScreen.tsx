import { useState } from "react";
import { Building2, Compass, MapPin, Plane, Sparkles } from "lucide-react";
import { useLocationSource } from "../lib/useLocationSource";
import { askAi } from "../lib/ai";
import { tt } from "../lib/i18n";

// Kullanıcının isteğiyle eklendi — Keşfet/İlgi Alanlarım'daki aynı konum
// mantığı (GPS yoksa elle adres) burada da geçerli, ama bu sefer "nereye
// gideceğim" (varış noktası) için kullanılıyor. Uçak/otel için gerçek
// rezervasyon entegrasyonu yok — Google arama linkleri açılıyor.

export function TripPlannerScreen({ userId }: { userId: string }) {
  const location = useLocationSource(userId);
  const [destination, setDestination] = useState("");
  const [dates, setDates] = useState("");
  const [plan, setPlan] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "missing-key" | "error" | "ready">("idle");

  async function suggest() {
    if (!destination.trim()) return;
    setBusy(true);
    const result = await askAi(
      "Sen Planmoy'un tatil/seyahat planlama asistanısın. Türkçe yaz, en fazla 4 cümle. Gidilecek yer için gezilecek 3 öneri ver; uçak/otel rezervasyonunu kendin yapmadığını, bunun için Google üzerinden arama linkleri sunulduğunu belirt.",
      `Varış noktası: ${destination}. Tarih/zaman: ${dates || "belirtilmedi"}.`
    );
    setBusy(false);
    if (!result.ok) {
      setStatus(result.reason === "missing-key" ? "missing-key" : "error");
      return;
    }
    setPlan(result.suggestion);
    setStatus("ready");
  }

  const q = encodeURIComponent(destination || location.manualAddress || "");

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-xl text-sm leading-relaxed text-[var(--color-mist-300)]">
        {tt({
          tr: "Gelecek günlerini veya tatilini planla — uçak, otel ve gezilecek yer önerilerini tek yerde topla.",
          en: "Plan your upcoming days or vacation — flights, hotels, and places to visit, all in one place.",
        })}
      </p>

      {/* Aynı konum bloğu (Keşfet ve İlgi Alanlarım'daki gibi) — burada varış noktası için */}
      <div className="orbit-card flex flex-col gap-3 p-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-mist-300)]">{tt({ tr: "Nereye gidiyorsun?", en: "Where are you going?" })}</span>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={tt({ tr: "Örn. Antalya, Paris, Kapadokya", en: "e.g. Paris, Rome, Bali" })}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--color-cyan-400)]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-mist-300)]">{tt({ tr: "Ne zaman?", en: "When?" })}</span>
          <input
            value={dates}
            onChange={(e) => setDates(e.target.value)}
            placeholder={tt({ tr: "Örn. Aralık ortası, 5 gün", en: "e.g. mid-December, 5 days" })}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--color-cyan-400)]"
          />
        </label>
        <button onClick={suggest} disabled={busy || !destination.trim()} className="primary-button">
          <Sparkles size={16} /> {busy ? tt({ tr: "Planlanıyor…", en: "Planning…" }) : tt({ tr: "Bana plan öner", en: "Suggest a plan" })}
        </button>
      </div>

      {/* Uçak / Otel — gerçek rezervasyon değil, Google arama linkleri */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <a
          href={`https://www.google.com/travel/flights?q=${q}`}
          target="_blank"
          rel="noreferrer"
          className="orbit-card flex items-center gap-3 p-4 hover:border-[var(--color-cyan-400)]/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12">
            <Plane size={18} className="text-[var(--color-cyan-300)]" />
          </span>
          <div>
            <p className="font-medium">{tt({ tr: "Uçak bileti ara", en: "Search flights" })}</p>
            <p className="text-xs text-[var(--color-mist-500)]">Google Flights</p>
          </div>
        </a>
        <a
          href={`https://www.google.com/travel/hotels?q=${q}`}
          target="_blank"
          rel="noreferrer"
          className="orbit-card flex items-center gap-3 p-4 hover:border-[var(--color-cyan-400)]/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12">
            <Building2 size={18} className="text-[var(--color-cyan-300)]" />
          </span>
          <div>
            <p className="font-medium">{tt({ tr: "Otel ara", en: "Search hotels" })}</p>
            <p className="text-xs text-[var(--color-mist-500)]">Google Hotels</p>
          </div>
        </a>
      </div>

      {status === "missing-key" && (
        <p className="suggestion">{tt({ tr: "AI sağlayıcısı (Gemini) henüz yapılandırılmadı.", en: "AI provider (Gemini) isn't configured yet." })}</p>
      )}
      {status === "error" && <p className="suggestion">{tt({ tr: "Plan alınamadı, tekrar dene.", en: "Couldn't get a plan, try again." })}</p>}
      {plan && (
        <div className="orbit-card p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--color-cyan-300)]">
            <Compass size={14} /> {tt({ tr: "Gezilecek yer önerileri", en: "Places to visit" })}
          </div>
          <p className="mt-2 text-sm leading-relaxed">{plan}</p>
          <a
            href={`https://www.google.com/maps/search/${encodeURIComponent(`gezilecek yerler ${destination}`)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--color-cyan-300)] hover:underline"
          >
            <MapPin size={12} /> {tt({ tr: "Google Maps'te ara", en: "Search on Google Maps" })}
          </a>
        </div>
      )}
    </div>
  );
}
