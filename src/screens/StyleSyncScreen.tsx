import { useEffect, useRef, useState } from "react";
import { ImagePlus, Plus, Shirt, Sparkles, Trash2, Dumbbell } from "lucide-react";
import { supabase } from "../lib/supabase";
import { askAi } from "../lib/ai";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/routes/stylesync.tsx dosyasından birebir
// taşınmıştır: aynı 5 kategori, aynı 5 hava durumu seçeneği, aynı
// "yalnızca metin, görsel analiz yok" AI davranışı, aynı "yüz/beden
// değiştirme iddiasında bulunma" güvenlik kuralı.

type Item = { id: string; name: string; category: string; color: string; imageUrl?: string | null; imagePath?: string | null };

const categories = ["Üst giyim", "Alt giyim", "Dış giyim", "Ayakkabı", "Aksesuar"];
const weatherOptions = ["Güneşli, 24°C", "Parçalı bulutlu, 19°C", "Yağmurlu, 12°C", "Karlı, 1°C", "Rüzgarlı, 10°C"];

export function StyleSyncScreen({ userId }: { userId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [color, setColor] = useState("");
  const [weather, setWeather] = useState(weatherOptions[1]);
  const [occasion, setOccasion] = useState("Günlük plan");
  const [advice, setAdvice] = useState("");
  const [tryOnPlan, setTryOnPlan] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const { data } = await supabase.from("wardrobe_items").select("*").order("created_at", { ascending: false });
    const withUrls = await Promise.all(
      (data ?? []).map(async (row) => {
        let imageUrl: string | null = null;
        if (row.image_key) {
          const { data: signed } = await supabase.storage.from("wardrobe").createSignedUrl(row.image_key, 3600);
          imageUrl = signed?.signedUrl ?? null;
        }
        return { id: row.id, name: row.name, category: row.category, color: row.color, imageUrl, imagePath: row.image_key };
      })
    );
    setItems(withUrls);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !color.trim()) return;
    setBusy(true);
    try {
      let imageKey: string | undefined;
      const file = fileRef.current?.files?.[0];
      if (file) {
        if (file.size > 8_000_000) throw new Error(tt({ tr: "Fotoğraf 8 MB altında olmalı.", en: "Photo must be under 8 MB." }));
        imageKey = `${userId}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("wardrobe").upload(imageKey, file, { contentType: file.type });
        if (upErr) throw upErr;
      }
      await supabase.from("wardrobe_items").insert({ user_id: userId, name, category, color, image_key: imageKey ?? null });
      setName("");
      setColor("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) {
      setAdvice(e instanceof Error ? e.message : tt({ tr: "Kayıt sırasında sorun oluştu.", en: "Something went wrong while saving." }));
    } finally {
      setBusy(false);
    }
  }

  async function suggest() {
    setBusy(true);
    const wardrobeText = items.map((i) => `${i.name} (${i.category}, ${i.color})`).join(", ") || tt({ tr: "gardırop boş", en: "wardrobe is empty" });
    const result = await askAi(
      "Sen Planmoy'un StyleSync stil asistanısın. Türkçe yaz, en fazla 3 cümle. Hava durumu ve renk uyumunu değerlendir, yağmurda şemsiye/karda mont gibi işlevsel öneriler ekle. ASLA fotoğraf ürettiğini veya kullanıcının bedenini/yüzünü değiştirdiğini iddia etme — yalnızca metin öner.",
      `Hava: ${weather}. Plan: ${occasion}. Gardırop: ${wardrobeText}.`
    );
    setBusy(false);
    if (!result.ok) {
      setAdvice(result.reason === "missing-key" ? tt({ tr: "AI sağlayıcısı (Gemini) henüz yapılandırılmadı.", en: "AI provider (Gemini) isn't configured yet." }) : tt({ tr: "Öneri alınamadı, tekrar dene.", en: "Couldn't get advice, try again." }));
      return;
    }
    setAdvice(result.suggestion);
  }

  async function tryOn() {
    setBusy(true);
    const wardrobeText = items.map((i) => `${i.name} (${i.category})`).join(", ") || tt({ tr: "gardırop boş", en: "wardrobe is empty" });
    const result = await askAi(
      "Sen Planmoy'un sanal deneme panosu asistanısın. Türkçe yaz, en fazla 3 cümle. Kaydedilen parçaların katman sırasını (iç-dış) öner. ASLA yüz veya beden değiştirdiğini, gerçek bir fotoğraf ürettiğini iddia etme — yalnızca metinle katman sırası öner.",
      `Plan: ${occasion}. Parçalar: ${wardrobeText}.`
    );
    setBusy(false);
    if (!result.ok) {
      setAdvice(result.reason === "missing-key" ? tt({ tr: "AI sağlayıcısı (Gemini) henüz yapılandırılmadı.", en: "AI provider (Gemini) isn't configured yet." }) : tt({ tr: "Görsel deneme hazırlanamadı.", en: "Couldn't prepare a try-on plan." }));
      return;
    }
    setTryOnPlan(result.suggestion);
  }

  async function remove(item: Item) {
    if (item.imagePath) await supabase.storage.from("wardrobe").remove([item.imagePath]);
    await supabase.from("wardrobe_items").delete().eq("id", item.id);
    setItems((v) => v.filter((i) => i.id !== item.id));
  }

  return (
    <>
      <div className="module-heading compact">
        <p className="eyebrow blue-label">{tt({ tr: "Gardırop + hava", en: "Wardrobe + weather" })}</p>
        <h2>{tt({ tr: "Bugün ne", en: "What to" })}<br /><em>{tt({ tr: "giysem?", en: "wear today?" })}</em></h2>
        <p>{tt({ tr: "Alt ve üst parçalarını kaydet. Planmoy, hava koşulunu ve renk uyumunu birlikte okuyarak uygulanabilir bir öneri hazırlar.", en: "Save your pieces. Planmoy weighs the weather and color harmony together for a practical suggestion." })}</p>
      </div>

      <section className="style-weather-strip panel">
        <div>
          <p className="eyebrow">{tt({ tr: "Koşul seç", en: "Pick a condition" })}</p>
          <select value={weather} onChange={(e) => setWeather(e.target.value)}>
            {weatherOptions.map((w) => <option key={w}>{w}</option>)}
          </select>
        </div>
        <div>
          <label className="eyebrow" htmlFor="occasion">{tt({ tr: "Bugünkü plan", en: "Today's plan" })}</label>
          <input id="occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)} />
        </div>
        <button className="primary-button" onClick={suggest} disabled={busy}>
          <Sparkles size={16} /> {busy ? tt({ tr: "Hazırlanıyor…", en: "Preparing…" }) : tt({ tr: "Kombin öner", en: "Suggest an outfit" })}
        </button>
      </section>

      <section className="tryon-panel panel">
        <div>
          <p className="eyebrow blue-label">{tt({ tr: "GÖRSEL DENEME PANOSU", en: "TRY-ON BOARD" })}</p>
          <h3>{tt({ tr: "Kombini parçalarınla gör.", en: "See the outfit with your own pieces." })}</h3>
          <p>{tt({ tr: "Yapay zeka, kaydettiğin parçaları katman sırasına göre eşleştirir; pano önizlemesi fotoğrafını veya bedenini değiştirmez.", en: "The AI matches your saved pieces by layering order; the preview never changes your photo or body." })}</p>
          {tryOnPlan && <div className="suggestion" role="status"><Sparkles size={15} /> {tryOnPlan}</div>}
        </div>
        <div className="tryon-preview">
          {items.filter((i) => i.imageUrl).slice(0, 3).map((i) => <img key={i.id} src={i.imageUrl ?? ""} alt={`${i.name} önizleme`} />)}
          {!items.some((i) => i.imageUrl) && <span>{tt({ tr: "Fotoğraflı parçalarını eklediğinde önizleme burada oluşur.", en: "Add photos of your pieces to see a preview here." })}</span>}
        </div>
        <button className="primary-button" type="button" onClick={tryOn} disabled={busy}>
          <Sparkles size={16} /> {busy ? tt({ tr: "Hazırlanıyor…", en: "Preparing…" }) : tt({ tr: "Yapay zeka ile görsel dene", en: "Try it on with AI" })}
        </button>
      </section>

      <section className="module-grid">
        <article className="panel wardrobe-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{tt({ tr: "Kişisel gardırop", en: "Personal wardrobe" })}</p>
              <h3>{items.length} {tt({ tr: "kayıtlı parça", en: "saved pieces" })}</h3>
            </div>
            <label className="photo-add">
              <ImagePlus size={15} /> {tt({ tr: "Fotoğraf", en: "Photo" })}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} />
            </label>
          </div>
          <div className="wardrobe-list">
            {items.map((item) => (
              <div className="wardrobe-item" key={item.id}>
                {item.imageUrl ? <img className="clothing-photo" src={item.imageUrl} alt={item.name} /> : <span className="clothing-mark"><Shirt size={19} /></span>}
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.category} · {item.color}</small>
                </div>
                <button onClick={() => remove(item)} aria-label={`${item.name} sil`}><Trash2 size={15} /></button>
              </div>
            ))}
            {!items.length && (
              <div className="module-empty">
                <Shirt size={22} />
                <p>{tt({ tr: "İlk parçanı ekle; kombin önerileri gardırobunla kişiselleşsin.", en: "Add your first piece; outfit advice becomes personal to your wardrobe." })}</p>
              </div>
            )}
          </div>
          <form className="wardrobe-form" onSubmit={add}>
            <label>
              {tt({ tr: "Parça adı", en: "Item name" })}
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tt({ tr: "Örn. lacivert gömlek", en: "e.g. navy shirt" })} />
            </label>
            <label>
              {tt({ tr: "Tür", en: "Type" })}
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>
              {tt({ tr: "Renk", en: "Color" })}
              <input value={color} onChange={(e) => setColor(e.target.value)} placeholder={tt({ tr: "Örn. lacivert", en: "e.g. navy" })} />
            </label>
            <button className="primary-button" disabled={busy}><Plus size={16} /> {tt({ tr: "Kaydet", en: "Save" })}</button>
          </form>
          <p className="local-note">{tt({ tr: "Fotoğraflar özel hesabında saklanır; 8 MB sınırı vardır.", en: "Photos are stored privately in your account; 8 MB limit applies." })}</p>
        </article>

        <article className="panel style-advice">
          <div className="advice-orb"><Sparkles size={22} /></div>
          <p className="eyebrow blue-label">{tt({ tr: "yapay zeka stil asistanı", en: "ai style assistant" })}</p>
          <h3>{tt({ tr: "Hava, renk ve planı", en: "Bring weather, color, and plan" })}<br />{tt({ tr: "aynı görünümde buluştur.", en: "together in one look." })}</h3>
          <p>{tt({ tr: "Yağmurda şemsiye, karda mont, rüzgârda pardösü gibi işlevsel detaylar öneriye dahil edilir.", en: "Practical details like an umbrella for rain or a coat for snow are included." })}</p>
          {advice ? (
            <div className="suggestion" role="status"><Sparkles size={15} />{advice}</div>
          ) : (
            <div className="suggestion"><Dumbbell size={15} /> {tt({ tr: "Henüz öneri yok. Parçalarını kaydet ve bugünün koşulunu seç.", en: "No suggestion yet. Save your pieces and pick today's condition." })}</div>
          )}
        </article>
      </section>
    </>
  );
}
