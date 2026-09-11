import { useEffect, useState } from "react";
import { Hotel, Shirt, Sparkles, Trophy, Utensils } from "lucide-react";
import { supabase } from "../lib/supabase";
import { askAi } from "../lib/ai";
import { useLocationSource } from "../lib/useLocationSource";
import { useTravelData } from "../lib/useTravelData";
import { tt } from "../lib/i18n";

// Kullanıcının isteğiyle: uygulama açıldığında (elle adres varsa o adrese,
// yoksa GPS'e göre) 30-50 km içindeki en popüler otel/restoran/gezilecek
// yer + bugünün öne çıkan maçı + gardıroba göre kıyafet önerisi.
// NOT: canlı hava durumu entegrasyonu yok (StyleSync'te de manuel seçim
// kullanılıyor) — kıyafet önerisi hava durumunu varsaymadan, sadece
// gardıropla veriliyor, bu dürüstçe belirtiliyor.

export function TodayHighlights({ userId }: { userId: string }) {
  const location = useLocationSource(userId);
  const hotels = useTravelData("hotel", location);
  const restaurants = useTravelData("restaurant", location);
  const [match, setMatch] = useState<{ home: string; away: string; league: string } | null>(null);
  const [outfit, setOutfit] = useState("");
  const [outfitStatus, setOutfitStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    supabase.functions.invoke("sports-fixtures", { body: { sport: "football" } }).then(({ data }) => {
      if (data?.ok && data.events?.length) setMatch(data.events[0]);
    });
  }, []);

  async function suggestOutfit() {
    setOutfitStatus("loading");
    const { data: items } = await supabase.from("wardrobe_items").select("name, category, color").eq("user_id", userId).limit(20);
    if (!items || !items.length) {
      setOutfit(tt({ tr: "Gardırobun boş — StyleSync'te birkaç parça ekleyince burada öneri görünür.", en: "Your wardrobe is empty — add a few pieces in StyleSync to see suggestions here." }));
      setOutfitStatus("ready");
      return;
    }
    const wardrobeText = items.map((i) => `${i.name} (${i.category}, ${i.color})`).join(", ");
    const result = await askAi(
      "Sen Planmoy'un StyleSync asistanısın. Türkçe, tek cümle. Canlı hava durumu verin yok, bu yüzden mevsime göre genel ve dengeli bir öneri ver, kesin hava durumu iddiasında bulunma.",
      `Gardırop: ${wardrobeText}.`
    );
    setOutfit(result.ok ? result.suggestion : tt({ tr: "AI sağlayıcısı (Gemini) henüz yapılandırılmadı.", en: "AI provider (Gemini) isn't configured yet." }));
    setOutfitStatus("ready");
  }

  if (location.activeSource === "none") {
    return (
      <div className="orbit-card p-4 text-sm text-[var(--color-mist-500)]">
        {tt({
          tr: "Günün özetini görmek için Keşfet'ten adresini gir.",
          en: "Enter your address in Discover to see today's highlights.",
        })}
      </div>
    );
  }

  const topHotel = hotels.places[0];
  const topRestaurant = restaurants.places[0];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <article className="orbit-card p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12">
          <Hotel size={16} className="text-[var(--color-cyan-300)]" />
        </span>
        <p className="mt-2 text-xs text-[var(--color-mist-500)]">{tt({ tr: "Bölgedeki popüler otel", en: "Popular hotel nearby" })}</p>
        <p className="mt-1 text-sm font-medium">{topHotel ? topHotel.name : "—"}</p>
      </article>
      <article className="orbit-card p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12">
          <Utensils size={16} className="text-[var(--color-cyan-300)]" />
        </span>
        <p className="mt-2 text-xs text-[var(--color-mist-500)]">{tt({ tr: "Bölgedeki popüler restoran", en: "Popular restaurant nearby" })}</p>
        <p className="mt-1 text-sm font-medium">{topRestaurant ? topRestaurant.name : "—"}</p>
      </article>
      <article className="orbit-card p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12">
          <Trophy size={16} className="text-[var(--color-cyan-300)]" />
        </span>
        <p className="mt-2 text-xs text-[var(--color-mist-500)]">{tt({ tr: "Bugünün öne çıkan maçı", en: "Today's featured match" })}</p>
        <p className="mt-1 text-sm font-medium">{match ? `${match.home} - ${match.away}` : "—"}</p>
      </article>
      <article className="orbit-card p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12">
          <Shirt size={16} className="text-[var(--color-cyan-300)]" />
        </span>
        <p className="mt-2 text-xs text-[var(--color-mist-500)]">{tt({ tr: "Gardıroba göre kıyafet", en: "Outfit from your wardrobe" })}</p>
        {outfitStatus === "idle" && (
          <button onClick={suggestOutfit} className="mt-1 flex items-center gap-1 text-xs text-[var(--color-cyan-300)]">
            <Sparkles size={12} /> {tt({ tr: "Öneri al", en: "Get suggestion" })}
          </button>
        )}
        {outfitStatus === "loading" && <p className="mt-1 text-xs text-[var(--color-mist-500)]">{tt({ tr: "Hazırlanıyor…", en: "Preparing…" })}</p>}
        {outfitStatus === "ready" && <p className="mt-1 text-xs">{outfit}</p>}
      </article>
    </section>
  );
}
