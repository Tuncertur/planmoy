import { useState } from "react";
import { Flame, Send, X } from "lucide-react";
import { askAi } from "../lib/ai";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek .assistant-fab / .assistant-popover CSS'i ve
// ember-pulse/assistant-rise animasyonları kullanılıyor (bkz. core-styles.css).
export function AssistantFab() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask() {
    if (!question.trim()) return;
    setBusy(true);
    const result = await askAi(
      "Sen Planmoy'un genel yapay zeka asistanısın. Türkçe, kısa ve uygulanabilir cevap ver (en fazla 3 cümle).",
      question
    );
    setBusy(false);
    setAnswer(result.ok ? result.suggestion : tt({ tr: "AI sağlayıcısı (Gemini) henüz yapılandırılmadı.", en: "AI provider (Gemini) isn't configured yet." }));
  }

  return (
    <>
      {open && (
        <div className="assistant-popover" role="dialog" aria-label="Yapay zeka asistanı">
          <div className="assistant-popover-head">
            <div>
              <span className="assistant-kicker">PLANMOY AI</span>
              <h2>{tt({ tr: "Sorunu sor.", en: "Ask anything." })}</h2>
            </div>
            <button className="assistant-close" onClick={() => setOpen(false)} aria-label="Kapat">
              <X size={15} />
            </button>
          </div>
          <p className="assistant-copy">
            {tt({ tr: "Takvim, görevler, stil ya da işletmenle ilgili bir şey sor.", en: "Ask about your calendar, tasks, style, or business." })}
          </p>
          {answer ? (
            <div className="assistant-suggestion">
              <Flame size={16} />
              <p>{answer}</p>
            </div>
          ) : (
            <div className="assistant-empty">
              <Flame size={16} />
              <p>{tt({ tr: "Henüz bir şey sormadın.", en: "You haven't asked anything yet." })}</p>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder={tt({ tr: "Sorunu yaz…", en: "Type your question…" })}
              style={{ flex: 1, border: "1px solid #ead9be", borderRadius: 7, padding: 8, fontSize: 11 }}
            />
            <button className="assistant-ask" style={{ width: "auto", padding: "0 14px" }} onClick={ask} disabled={busy}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
      <button className={`assistant-fab ${open ? "is-open" : ""}`} onClick={() => setOpen((v) => !v)} aria-label="Yapay zeka asistanı">
        <Flame size={21} />
        <span>AI</span>
      </button>
    </>
  );
}
