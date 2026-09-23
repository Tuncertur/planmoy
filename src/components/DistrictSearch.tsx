import { useEffect, useState } from "react";
import { MapPinned } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLocationSource } from "../lib/useLocationSource";
import { getActiveLang, tt } from "../lib/i18n";

export function DistrictSearch({ userId }: { userId: string }) {
  const location = useLocationSource(userId);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ text: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      supabase.functions
        .invoke("places-autocomplete", { body: { input: query.trim(), languageCode: getActiveLang() } })
        .then(({ data }) => {
          if (!cancelled && data?.ok) setResults(data.suggestions);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  async function choose(text: string) {
    location.setManualAddress(text);
    await location.saveManualAddress();
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative", flex: 1, maxWidth: 200, minWidth: 110 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px", borderRadius: 10, border: "1px solid var(--space-line, rgba(255,255,255,0.15))", background: "var(--space-panel, rgba(255,255,255,0.06))" }}>
        <MapPinned size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={tt({ tr: "Şehir/bölge yaz…", en: "Type a city…" })}
          style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, outline: "none", color: "inherit", fontSize: 12, fontWeight: 600 }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: 44, left: 0, right: 0, minWidth: 240, background: "var(--space-panel, #0f1c38)", border: "1px solid var(--space-line, #223454)", borderRadius: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.3)", overflow: "hidden", zIndex: 100 }}>
          {results.map((r, i) => (
            <button
              key={i}
              onMouseDown={() => choose(r.text)}
              style={{ display: "block", width: "100%", padding: "10px 14px", border: 0, background: "transparent", color: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" }}
            >
              {r.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
