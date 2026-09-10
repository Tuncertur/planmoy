import { useEffect, useState } from "react";
import { Compass, Heart, MapPin, Plus, Sparkles, Trash2, WandSparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { askAi } from "../lib/ai";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/routes/space.tsx dosyasından taşınmıştır —
// "önce konum, sonra zaman, sonra ilgi alanı" öncelik sırası korunuyor.
type Interest = { id: string; name: string; kind: string; intensity: string };
const kinds = ["hobi", "spor", "el sanatı", "bakım", "öğrenme"];

export function SpaceScreen({ userId }: { userId: string }) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(30);
  const [name, setName] = useState("");
  const [kind, setKind] = useState(kinds[0]);
  const [timeContext, setTimeContext] = useState(tt({ tr: "Bu hafta sonu, Cumartesi öğleden sonra", en: "This weekend, Saturday afternoon" }));
  const [plan, setPlan] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const { data } = await supabase.from("user_interests").select("*").order("created_at", { ascending: false });
    setInterests(data ?? []);
    const { data: pref } = await supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
    // Konum tercihi ayrı bir alanda saklanmıyor henüz — basitlik için burada tutuluyor.
    void pref;
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("user_interests").insert({ user_id: userId, name, kind, intensity: "merak ediyorum" });
    setBusy(false);
    setMessage(error ? tt({ tr: "İlgi alanı eklenemedi.", en: "Couldn't add interest." }) : tt({ tr: "İlgi alanın profiline eklendi.", en: "Added to your interest profile." }));
    if (!error) {
      setName("");
      load();
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setMessage(tt({ tr: "Bu cihaz konum paylaşımını desteklemiyor.", en: "This device doesn't support location sharing." }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocation(tt({ tr: "Mevcut konumum", en: "My current location" }));
        setMessage(tt({ tr: "Konum kaydedildi. Öneriler yarıçap içinde aranacak.", en: "Location saved. Suggestions will search within the radius." }));
      },
      () => setMessage(tt({ tr: "Konum izni verilmedi. Şehrini manuel yazabilirsin.", en: "Location permission denied. You can type your city manually." }))
    );
  }

  async function suggest() {
    if (!location.trim()) {
      setMessage(tt({ tr: "Önce şehir veya konum ekle.", en: "Add a city or location first." }));
      return;
    }
    setBusy(true);
    const result = await askAi(
      "Sen Planmoy'un bölgesel keşif asistanısın. Türkçe yaz, en fazla 3 cümle. ÖNCELİK SIRASI: önce konum ve yarıçap, sonra kullanıcının uygun zamanı, en son ilgi alanları. İşletme isimlerini uydurma, genel bir aktivite fikri öner.",
      `Konum: ${location} (${radius} km). Zaman: ${timeContext}. İlgi alanları: ${interests.map((i) => `${i.name} (${i.kind})`).join(", ") || "belirtilmedi"}.`
    );
    setBusy(false);
    if (!result.ok) {
      setMessage(result.reason === "missing-key" ? tt({ tr: "AI sağlayıcısı (Gemini) henüz yapılandırılmadı.", en: "AI provider (Gemini) isn't configured yet." }) : tt({ tr: "Öneri alınamadı.", en: "Couldn't get a suggestion." }));
      return;
    }
    setPlan(result.suggestion);
    setMessage(tt({ tr: "Konum + zaman + ilgi alanların birlikte değerlendirildi.", en: "Location + time + interests were weighed together." }));
  }

  return (
    <div>
      <div className="module-heading compact">
        <p className="eyebrow blue-label">{tt({ tr: "Konum · zaman · merak", en: "Location · time · curiosity" })}</p>
        <h2>{tt({ tr: "Boş vaktini", en: "Discover your free time" })}<br /><em>{tt({ tr: "kendine göre keşfet.", en: "on your own terms." })}</em></h2>
      </div>

      <section className="module-grid" style={{ marginTop: 16 }}>
        <article className="panel interest-profile">
          <div className="panel-heading">
            <div><p className="eyebrow">{tt({ tr: "Kişisel profil", en: "Personal profile" })}</p><h3>{tt({ tr: "Senin dünyan", en: "Your world" })}</h3></div>
            <Heart size={19} />
          </div>
          <div className="wardrobe-form">
            <label>
              {tt({ tr: "Öncelikli bölge", en: "Priority area" })}
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={tt({ tr: "Örn. Kadıköy, İstanbul", en: "e.g. downtown" })} />
            </label>
            <label>
              {tt({ tr: "Arama yarıçapı", en: "Search radius" })}
              <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                <option value={10}>10 km</option><option value={20}>20 km</option><option value={30}>30 km</option><option value={50}>50 km</option>
              </select>
            </label>
            <button type="button" className="secondary-button" onClick={locate}><MapPin size={15} /> {tt({ tr: "Konumumu kullan", en: "Use my location" })}</button>
          </div>

          <form onSubmit={add} className="wardrobe-form" style={{ marginTop: 12 }}>
            <label>
              {tt({ tr: "Yeni ilgi alanı", en: "New interest" })}
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tt({ tr: "Örn. seramik, yoga, hamam", en: "e.g. pottery, yoga" })} />
            </label>
            <label>
              {tt({ tr: "Alan", en: "Category" })}
              <select value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map((k) => <option key={k}>{k}</option>)}</select>
            </label>
            <button className="primary-button" disabled={busy}><Plus size={15} /> {tt({ tr: "Ekle", en: "Add" })}</button>
          </form>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {interests.map((item) => (
              <span key={item.id} className="orbit-card" style={{ padding: "4px 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                {item.name} <small style={{ color: "var(--color-mist-500)" }}>{item.kind}</small>
                <button onClick={async () => { await supabase.from("user_interests").delete().eq("id", item.id); load(); }} aria-label={`${item.name} sil`}>
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
            {!interests.length && <p style={{ fontSize: 11, color: "var(--color-mist-500)" }}>{tt({ tr: "İlgi alanların burada birikerek önerileri kişiselleştirir.", en: "Your interests accumulate here to personalize suggestions." })}</p>}
          </div>
        </article>

        <aside className="panel local-ai">
          <Compass size={21} />
          <p className="eyebrow blue-label">{tt({ tr: "Bölgesel keşif asistanı", en: "Local discovery assistant" })}</p>
          <h3>{tt({ tr: "Şehrindeki zamanı", en: "Turn your free time" })}<br />{tt({ tr: "fırsata çevir.", en: "into an opportunity." })}</h3>
          <label className="time-label">
            {tt({ tr: "Ne zaman boşsun?", en: "When are you free?" })}
            <textarea value={timeContext} onChange={(e) => setTimeContext(e.target.value)} />
          </label>
          <button className="primary-button" onClick={suggest} disabled={busy}>
            <WandSparkles size={15} /> {busy ? tt({ tr: "Akış okunuyor…", en: "Reading your flow…" }) : tt({ tr: "Bana plan öner", en: "Suggest a plan" })}
          </button>
        </aside>
      </section>

      {plan && (
        <section className="plan-result panel" style={{ marginTop: 16 }}>
          <Sparkles size={18} />
          <div>
            <p className="eyebrow blue-label">{tt({ tr: "Öncelik sırası uygulandı", en: "Priority order applied" })}</p>
            <h3>{location} · {radius} km</h3>
          </div>
          <p>{plan}</p>
        </section>
      )}
      {message && <p className="suggestion" role="status" style={{ marginTop: 10 }}>{message}</p>}
    </div>
  );
}
