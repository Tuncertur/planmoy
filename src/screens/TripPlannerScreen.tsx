import { useEffect, useState } from "react";
import { Building2, Bus, Car, Compass, MapPin, Plane, Sparkles, TrainFront, Utensils } from "lucide-react";
import { useLocationSource } from "../lib/useLocationSource";
import { askAi } from "../lib/ai";
import { refreshTravelDataForAddress } from "../lib/useTravelData";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";

// Kullanıcının isteğiyle genişletildi: nereden-nereye + tarih aralığı +
// ulaşım tercihine göre öneri, ve İlgi Alanlarım'daki (user_interests)
// verilerle kişiselleştirme — kullanıcının "anket" dediği kişiselleştirme
// sinyali bu tablodan geliyor.

const transportOptions = [
  { id: "plane", label: { tr: "Uçak", en: "Plane" }, icon: Plane },
  { id: "train", label: { tr: "Tren", en: "Train" }, icon: TrainFront },
  { id: "bus", label: { tr: "Otobüs", en: "Bus" }, icon: Bus },
  { id: "car", label: { tr: "Araba", en: "Car" }, icon: Car },
] as const;

export function TripPlannerScreen({ userId }: { userId: string }) {
  const location = useLocationSource(userId);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transport, setTransport] = useState<(typeof transportOptions)[number]["id"]>("plane");
  const [interests, setInterests] = useState<string[]>([]);
  const [plan, setPlan] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "missing-key" | "error" | "ready">("idle");

  useEffect(() => {
    if (location.activeSource === "manual" && !origin) setOrigin(location.manualAddress);
    supabase
      .from("user_interests")
      .select("name")
      .eq("user_id", userId)
      .then(({ data }) => setInterests((data ?? []).map((i) => i.name)));
  }, [location.activeSource]);

  async function suggest() {
    if (!destination.trim() || !startDate || !endDate) return;
    setBusy(true);
    const transportLabel = transportOptions.find((t) => t.id === transport)!.label.tr;
    const system =
      "Sen Planmoy'un tatil/seyahat planlama asistanısın. Türkçe yaz, en fazla 6 cümle, maddeler hâlinde düşün ama düz metin yaz. " +
      "Şu sırayla değin: 1) gidiş ulaşımı (uçak/tren/otobüs biletini ara demeni öneriyorsun; araba seçiliyse güzergâh üzerindeki dinlenme tesisi önerisi ver), " +
      "2) varış noktasında kalınacak otel bölgesi önerisi, 3) yeme-içme önerisi, 4) gezilecek 2-3 yer, 5) dönüş için aynı mantık. " +
      "Kullanıcının ilgi alanlarını önerilerine yansıt. Gerçek işletme/uçuş/otel adı uydurma, genel ve türe göre öner. " +
      "Rezervasyonu kendin yapmadığını, Google linkleri sunulduğunu belirt.";
    const prompt = `Nereden: ${origin || "belirtilmedi"}. Nereye: ${destination}. Tarih aralığı: ${startDate} – ${endDate}. Ulaşım tercihi: ${transportLabel}. İlgi alanları: ${interests.join(", ") || "belirtilmedi"}.`;
    const result = await askAi(system, prompt);
    setBusy(false);
    if (!result.ok) {
      setStatus(result.reason === "missing-key" ? "missing-key" : "error");
      return;
    }
    setPlan(result.suggestion);
    setStatus("ready");
    // Tatil planı oluşturulunca Oteller/Restoranlar/Gezilecek Yerler de
    // varış noktasına göre (tek sorguda) yenilenir.
    refreshTravelDataForAddress(destination);
  }

  const q = encodeURIComponent(destination || location.manualAddress || "");
  const routeQ = encodeURIComponent(`${origin} - ${destination}`);

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-xl text-sm leading-relaxed text-[var(--color-mist-300)]">
        {tt({
          tr: "Gelecek günlerini veya tatilini planla — nereden nereye, hangi tarihte gideceğini yaz; uçak/tren/otobüs/araba, otel ve gezilecek yer önerilerini tek yerde topla.",
          en: "Plan your upcoming days or vacation — where from, where to, and when; flights, trains, buses, cars, hotels, and places to visit, all in one place.",
        })}
      </p>

      {interests.length === 0 && (
        <div className="orbit-card p-3 text-sm">
          {tt({
            tr: "İlgi alanlarını henüz eklemedin — İlgi Alanlarım sayfasından ekleyince öneriler sana göre kişiselleşir.",
            en: "You haven't added your interests yet — add them in My Interests to personalize suggestions.",
          })}
        </div>
      )}
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs text-[var(--color-cyan-300)]">
          {interests.map((i) => (
            <span key={i} className="orbit-card px-2 py-1">
              {i}
            </span>
          ))}
        </div>
      )}

      <div className="orbit-card flex flex-col gap-3 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-mist-300)]">{tt({ tr: "Nereden", en: "From" })}</span>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder={tt({ tr: "Örn. Ankara", en: "e.g. New York" })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--color-cyan-400)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-mist-300)]">{tt({ tr: "Nereye", en: "To" })}</span>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={tt({ tr: "Örn. İstanbul, Beykoz", en: "e.g. Paris" })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--color-cyan-400)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-mist-300)]">{tt({ tr: "Gidiş tarihi", en: "Start date" })}</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--color-cyan-400)]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-mist-300)]">{tt({ tr: "Dönüş tarihi", en: "End date" })}</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--color-cyan-400)]" />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {transportOptions.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTransport(t.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm ${
                  transport === t.id ? "bg-[var(--color-cyan-400)] text-[var(--color-space-950)]" : "border border-white/10 bg-white/5"
                }`}
              >
                <Icon size={14} /> {tt(t.label)}
              </button>
            );
          })}
        </div>

        <button onClick={suggest} disabled={busy || !destination.trim() || !startDate || !endDate} className="primary-button">
          <Sparkles size={16} /> {busy ? tt({ tr: "Planlanıyor…", en: "Planning…" }) : tt({ tr: "Bana plan öner", en: "Suggest a plan" })}
        </button>
      </div>

      {/* Ulaşım tercihine göre doğru Google linki */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {transport === "plane" && (
          <a href={`https://www.google.com/travel/flights?q=${routeQ}`} target="_blank" rel="noreferrer" className="orbit-card flex items-center gap-3 p-4 hover:border-[var(--color-cyan-400)]/40">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12"><Plane size={18} className="text-[var(--color-cyan-300)]" /></span>
            <div><p className="font-medium">{tt({ tr: "Uçak bileti ara", en: "Search flights" })}</p><p className="text-xs text-[var(--color-mist-500)]">Google Flights</p></div>
          </a>
        )}
        {transport === "train" && (
          <a href={`https://www.google.com/search?q=${routeQ}+tren+bileti`} target="_blank" rel="noreferrer" className="orbit-card flex items-center gap-3 p-4 hover:border-[var(--color-cyan-400)]/40">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12"><TrainFront size={18} className="text-[var(--color-cyan-300)]" /></span>
            <div><p className="font-medium">{tt({ tr: "Tren bileti ara", en: "Search trains" })}</p><p className="text-xs text-[var(--color-mist-500)]">Google</p></div>
          </a>
        )}
        {transport === "bus" && (
          <a href={`https://www.google.com/search?q=${routeQ}+otobüs+bileti`} target="_blank" rel="noreferrer" className="orbit-card flex items-center gap-3 p-4 hover:border-[var(--color-cyan-400)]/40">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12"><Bus size={18} className="text-[var(--color-cyan-300)]" /></span>
            <div><p className="font-medium">{tt({ tr: "Otobüs bileti ara", en: "Search buses" })}</p><p className="text-xs text-[var(--color-mist-500)]">Google</p></div>
          </a>
        )}
        {transport === "car" && (
          <a href={`https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`} target="_blank" rel="noreferrer" className="orbit-card flex items-center gap-3 p-4 hover:border-[var(--color-cyan-400)]/40">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12"><Car size={18} className="text-[var(--color-cyan-300)]" /></span>
            <div><p className="font-medium">{tt({ tr: "Yol tarifi + dinlenme tesisi", en: "Directions + rest stops" })}</p><p className="text-xs text-[var(--color-mist-500)]">Google Maps</p></div>
          </a>
        )}
        <a href={`https://www.google.com/travel/hotels?q=${q}`} target="_blank" rel="noreferrer" className="orbit-card flex items-center gap-3 p-4 hover:border-[var(--color-cyan-400)]/40">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12"><Building2 size={18} className="text-[var(--color-cyan-300)]" /></span>
          <div><p className="font-medium">{tt({ tr: "Otel ara", en: "Search hotels" })}</p><p className="text-xs text-[var(--color-mist-500)]">Google Hotels</p></div>
        </a>
        <a href={`https://www.google.com/maps/search/restoranlar+${q}`} target="_blank" rel="noreferrer" className="orbit-card flex items-center gap-3 p-4 hover:border-[var(--color-cyan-400)]/40">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12"><Utensils size={18} className="text-[var(--color-cyan-300)]" /></span>
          <div><p className="font-medium">{tt({ tr: "Yemek ara", en: "Search food" })}</p><p className="text-xs text-[var(--color-mist-500)]">Google Maps</p></div>
        </a>
      </div>

      {status === "missing-key" && <p className="suggestion">{tt({ tr: "AI sağlayıcısı (Gemini) henüz yapılandırılmadı.", en: "AI provider (Gemini) isn't configured yet." })}</p>}
      {status === "error" && <p className="suggestion">{tt({ tr: "Plan alınamadı, tekrar dene.", en: "Couldn't get a plan, try again." })}</p>}
      {plan && (
        <div className="orbit-card p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--color-cyan-300)]">
            <Compass size={14} /> {tt({ tr: "Kişiselleştirilmiş seyahat planı", en: "Personalized trip plan" })}
          </div>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{plan}</p>
          <a href={`https://www.google.com/maps/search/${encodeURIComponent(`gezilecek yerler ${destination}`)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--color-cyan-300)] hover:underline">
            <MapPin size={12} /> {tt({ tr: "Google Maps'te ara", en: "Search on Google Maps" })}
          </a>
        </div>
      )}
    </div>
  );
}
