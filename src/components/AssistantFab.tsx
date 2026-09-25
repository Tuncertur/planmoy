import { useMemo, useState } from "react";
import { Check, ChevronRight, Flame, Search, Send, Sparkles, X } from "lucide-react";
import { askAi } from "../lib/ai";
import { findBlockedTerm, moderationMessage } from "../lib/content-moderation";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/components/personal-assistant.tsx dosyasından
// birebir taşınmıştır: arama/filtreleme, moderasyon kontrolü, "akışa
// ekle" onayı, hızlı linkler, işletme modunda gizlenme.

const destinations = [
  { id: "calendar", label: { tr: "Takvim ve alarmlar", en: "Calendar & reminders" }, keywords: "takvim alarm randevu zaman" },
  { id: "stylesync", label: { tr: "StyleSync gardırop", en: "StyleSync wardrobe" }, keywords: "stil kıyafet gardırop hava" },
  { id: "discover", label: { tr: "Yakınımda keşfet", en: "Discover nearby" }, keywords: "keşfet işletme spor hobi hamam" },
  { id: "sports", label: { tr: "Spor akışı", en: "Sports flow" }, keywords: "spor futbol basketbol tenis haber branş" },
  { id: "space", label: { tr: "İlgi alanlarım", en: "My interests" }, keywords: "hobi spor ilgi alanı hedef" },
  { id: "tasks", label: { tr: "Görevler", en: "Tasks" }, keywords: "görev yapılacak iş" },
  { id: "intelligence", label: { tr: "Yapay zeka", en: "Intelligence" }, keywords: "zeka yapay zeka öneri plan" },
  { id: "account", label: { tr: "Hesap", en: "Account" }, keywords: "profil güvenlik hesabım silme" },
];

export function AssistantFab({ isBusiness, go, open: openProp, onOpenChange }: { isBusiness: boolean; go: (id: string) => void; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (updater: boolean | ((v: boolean) => boolean)) => {
    const next = typeof updater === "function" ? (updater as (v: boolean) => boolean)(open) : updater;
    setOpenState(next);
    onOpenChange?.(next);
  };
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [accepted, setAccepted] = useState(false);

  const matches = useMemo(
    () =>
      query.trim()
        ? destinations.filter((item) => `${tt(item.label)} ${item.keywords}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")))
        : [],
    [query]
  );

  if (isBusiness) return null;

  async function ask() {
    if (findBlockedTerm(query)) {
      setSuggestion(moderationMessage);
      return;
    }
    setLoading(true);
    const result = await askAi(
      "Sen Planmoy'un genel yapay zeka asistanısın. Türkçe, kısa ve uygulanabilir cevap ver (en fazla 3 cümle).",
      `Kişisel yapay zeka; arama: ${query || "genel"}`
    );
    setLoading(false);
    setSuggestion(result.ok ? result.suggestion : tt({ tr: "AI sağlayıcısı (Gemini) henüz yapılandırılmadı.", en: "AI provider (Gemini) isn't configured yet." }));
  }

  return (
    <>
      {open && (
        <section className="assistant-popover" role="dialog" aria-label={tt({ tr: "Yapay zeka asistanı", en: "AI assistant" })}>
          <div className="assistant-popover-head">
            <div>
              <span className="assistant-kicker">
                <Sparkles size={13} /> {tt({ tr: "YAPAY ZEKA", en: "AI" })}
              </span>
              <h2>
                {tt({ tr: "Bugün neye", en: "What should we" })}
                <br />
                <em>{tt({ tr: "odaklanalım?", en: "focus on today?" })}</em>
              </h2>
            </div>
            <button className="assistant-close" onClick={() => setOpen(false)} aria-label={tt({ tr: "Asistanı kapat", en: "Close assistant" })}>
              <X size={16} />
            </button>
          </div>

          <label className="assistant-search">
            <Search size={15} />
            <span className="sr-only">{tt({ tr: "Uygulamada ara", en: "Search the app" })}</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tt({ tr: "Takvim, stil, hobi ara…", en: "Search calendar, style, hobbies…" })} />
          </label>

          {matches.length > 0 && (
            <div className="assistant-results">
              {matches.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    go(item.id);
                    setOpen(false);
                  }}
                >
                  {tt(item.label)} <ChevronRight size={14} />
                </button>
              ))}
            </div>
          )}

          <p className="assistant-copy">
            {tt({ tr: "Takvim, görev, stil ve hedeflerini birlikte düşünerek bir sonraki adımı bulalım.", en: "Let's find your next step by weighing your calendar, tasks, style and goals together." })}
          </p>

          {suggestion ? (
            <div className="assistant-suggestion">
              <Sparkles size={16} />
              <p>{suggestion}</p>
            </div>
          ) : (
            <div className="assistant-empty">
              <span className="assistant-envelope">✦</span>
              <p>{tt({ tr: "Henüz bugüne özel bir öneri istemedin.", en: "You haven't asked for today's suggestion yet." })}</p>
            </div>
          )}

          <button className="assistant-ask" onClick={ask} disabled={loading}>
            <Send size={15} />
            {loading ? tt({ tr: "Akış okunuyor…", en: "Reading your flow…" }) : suggestion ? tt({ tr: "Yeni öneri al", en: "Get a new suggestion" }) : tt({ tr: "Yapay zeka önerisi al", en: "Get AI advice" })}
          </button>

          <div className="assistant-links">
            <button onClick={() => go("tasks")}>{tt({ tr: "Görevler", en: "Tasks" })} <ChevronRight size={13} /></button>
            <button onClick={() => go("calendar")}>{tt({ tr: "Takvim", en: "Calendar" })} <ChevronRight size={13} /></button>
            <button onClick={() => go("stylesync")}>{tt({ tr: "Stil", en: "Style" })} <ChevronRight size={13} /></button>
          </div>

          {suggestion && (
            <button className={`assistant-accept ${accepted ? "accepted" : ""}`} onClick={() => setAccepted((v) => !v)}>
              {accepted ? <Check size={14} /> : <Flame size={14} />}
              {accepted ? tt({ tr: "Akışa eklendi", en: "Added to flow" }) : tt({ tr: "Öneriyi onayla", en: "Approve suggestion" })}
            </button>
          )}
        </section>
      )}
      {openProp === undefined && (
        <button
          className={`assistant-fab ${open ? "is-open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? tt({ tr: "Yapay zekanı kapat", en: "Close your AI" }) : tt({ tr: "Yapay zekanda ara ve öneri al", en: "Search your AI and get advice" })}
        >
          <Flame size={21} />
          <span>{tt({ tr: "Yapay zeka", en: "AI" })}</span>
        </button>
      )}
    </>
  );
}
