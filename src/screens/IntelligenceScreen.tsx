import { useState } from "react";
import { ArrowUpRight, CalendarDays, CheckCircle2, ListChecks, Sparkles, WandSparkles } from "lucide-react";
import { askAi } from "../lib/ai";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/routes/intelligence.tsx dosyasından taşınmıştır.
const cards = [
  { icon: CalendarDays, label: { tr: "Zaman", en: "Time" }, text: { tr: "Randevuların arasına 30 dakikalık bir nefes alanı bırak.", en: "Leave a 30-minute breathing room between appointments." } },
  { icon: ListChecks, label: { tr: "Görev", en: "Task" }, text: { tr: "Önce kısa olan görevi tamamla; günün ivmesini korursun.", en: "Finish the shortest task first to keep your momentum." } },
  { icon: WandSparkles, label: { tr: "Stil", en: "Style" }, text: { tr: "Bugün için sade ve dengeli bir kombin seç.", en: "Pick a simple, balanced outfit for today." } },
];

export function IntelligenceScreen() {
  const [accepted, setAccepted] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const result = await askAi(
      "Sen Planmoy'un kişisel akış asistanısın. Türkçe yaz, tek cümle, uygulanabilir bir öneri ver.",
      "Takvim, görevler ve kişisel bakım dengesi."
    );
    setLoading(false);
    setSuggestion(result.ok ? result.suggestion : tt({ tr: "AI sağlayıcısı (Gemini) henüz yapılandırılmadı.", en: "AI provider (Gemini) isn't configured yet." }));
  }

  return (
    <div>
      <div className="module-heading compact">
        <p className="eyebrow orange">{tt({ tr: "Takvim · görev · stil", en: "Calendar · tasks · style" })}</p>
        <h2>{tt({ tr: "Bugünün akışına", en: "Add a little intelligence" })}<br /><em>{tt({ tr: "biraz zeka kat.", en: "to today's flow." })}</em></h2>
        <p>{tt({ tr: "Planmoy, karar vermen gereken anları sade bir öneriyle bir araya getirir.", en: "Planmoy brings your decision points together with a simple suggestion." })}</p>
      </div>

      <button className="primary-button" onClick={refresh} disabled={loading} style={{ marginTop: 8 }}>
        <Sparkles size={16} /> {loading ? tt({ tr: "Akış okunuyor…", en: "Reading your flow…" }) : tt({ tr: "Yeni öneri", en: "New suggestion" })}
      </button>

      {suggestion && (
        <div className="ai-result" style={{ marginTop: 14 }}>
          <Sparkles size={18} />
          <div>
            <p className="eyebrow">{tt({ tr: "Planmoy önerisi", en: "Planmoy suggestion" })}</p>
            <strong>{suggestion}</strong>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ marginTop: 16 }}>
        {cards.map((card) => {
          const Icon = card.icon;
          const isAccepted = accepted.includes(card.label.tr);
          return (
            <article className="orbit-card p-4" key={card.label.tr}>
              <Icon size={18} className="text-[var(--color-cyan-300)]" />
              <p className="eyebrow" style={{ marginTop: 8 }}>{tt(card.label)}</p>
              <h3 style={{ fontSize: 13, marginTop: 4 }}>{tt(card.text)}</h3>
              <button
                onClick={() => setAccepted((v) => (isAccepted ? v.filter((x) => x !== card.label.tr) : [...v, card.label.tr]))}
                className="text-xs text-[var(--color-cyan-300)] inline-flex items-center gap-1 mt-2"
              >
                {isAccepted ? (<><CheckCircle2 size={14} /> {tt({ tr: "Akışa eklendi", en: "Added to flow" })}</>) : (<>{tt({ tr: "Öneriyi uygula", en: "Apply suggestion" })} <ArrowUpRight size={13} /></>)}
              </button>
            </article>
          );
        })}
      </section>

      <div className="orbit-card p-4 mt-4" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Sparkles size={16} className="text-[var(--color-cyan-300)]" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 11, color: "var(--color-mist-500)" }}>
          {tt({
            tr: "Öneriler mevcut takvimindeki ve çalışma alanındaki bilgilerden yola çıkar. Yapay zeka henüz otomatik işlem başlatmaz; onay her zaman sende.",
            en: "Suggestions are based on your existing calendar and workspace. The AI never takes action on its own — you always approve.",
          })}
        </span>
      </div>
    </div>
  );
}
