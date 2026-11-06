import { Sparkles } from "lucide-react";
import { getActiveLang } from "../lib/i18n";
import { useAiUsage } from "../lib/aiUsage";
import { aiText } from "../lib/aiUsageText";
import { formatDate, levelFor, percentUsed, showsNearLimit, type UsageState } from "../lib/aiUsageCore";

// Ana sayfada küçük ve sade "AI Kullanım Hakkım" kartı; `detailed` Hesap ekranında toplam/kullanılan/kalan/yenilenme gösterir.
// Sayılar yalnızca sunucudan gelir (ai-usage); okunamazsa kalan değer GÖSTERİLMEZ.
export function AiUsageCard({ detailed = false }: { detailed?: boolean }) {
  const { state, reload } = useAiUsage();
  return <AiUsageView state={state} detailed={detailed} onRetry={reload} />;
}

export function AiUsageView({ state, detailed, onRetry }: { state: UsageState; detailed: boolean; onRetry: () => void }) {
  const lang = getActiveLang();
  const head = (
    <header className="ai-usage-head"><Sparkles size={16} aria-hidden /><h3>{aiText.title()}</h3></header>
  );
  let body;
  if (state.kind === "loading") body = <p className="ai-usage-note">{aiText.loading()}</p>;
  else if (state.kind === "unavailable") body = (<><p className="ai-usage-note">{aiText.unavailable()}</p><button type="button" className="ai-usage-retry" onClick={onRetry}>{aiText.retry()}</button></>);
  else if (state.kind === "free") body = (<><p className="ai-usage-strong">{aiText.free()}</p>{detailed && <p className="ai-usage-note">{aiText.freeNote()}</p>}</>);
  else {
    const { used, limit, remaining, resetAt, approximate } = state;
    const level = levelFor(used, limit);
    const pct = percentUsed(used, limit);
    const date = formatDate(resetAt, lang);
    body = (
      <>
        <div className="ai-usage-row"><strong>{aiText.remaining(remaining)}</strong><span>{aiText.usedOf(used, limit)}</span></div>
        <div className={`ai-usage-bar ai-${level}`} role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used}>
          <i style={{ width: `${pct}%` }} />
        </div>
        {date && <p className="ai-usage-note">{aiText.renews(date, approximate)}</p>}
        {level === "full" ? <p className="ai-usage-msg ai-full">{aiText.full(date)}</p> : showsNearLimit(used, limit) ? <p className="ai-usage-msg ai-low">{aiText.nearLimit()}</p> : null}
        {detailed && (
          <>
            <dl className="ai-usage-detail">
              <div><dt>{aiText.total()}</dt><dd>{limit}</dd></div>
              <div><dt>{aiText.used()}</dt><dd>{used}</dd></div>
              <div><dt>{aiText.left()}</dt><dd>{remaining}</dd></div>
              {date && <div><dt>{aiText.renewal()}</dt><dd>{date}</dd></div>}
            </dl>
            {approximate && <p className="ai-usage-note">{aiText.approxHint()}</p>}
            <p className="ai-usage-note">{aiText.scope()}</p>
          </>
        )}
      </>
    );
  }
  return <section className={detailed ? "account-card ai-usage ai-usage-detailed" : "ai-usage"} aria-live="polite"><div>{head}{body}</div></section>;
}
