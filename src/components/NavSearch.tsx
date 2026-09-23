import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { tt } from "../lib/i18n";

type NavEntry = { id: string; icon: React.ReactNode; label: { tr: string; en: string }; external?: string };

export function NavSearch({ items, onSelect }: { items: NavEntry[]; onSelect: (id: string, external?: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLocaleLowerCase("tr");
    return items.filter((item) => tt(item.label).toLocaleLowerCase("tr").includes(q)).slice(0, 8);
  }, [query, items]);

  function choose(item: NavEntry) {
    onSelect(item.id, item.external);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1, maxWidth: 220, minWidth: 120 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px", borderRadius: 10, border: "1px solid var(--space-line, rgba(255,255,255,0.15))", background: "var(--space-panel, rgba(255,255,255,0.06))" }}>
        <Search size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={tt({ tr: "Sayfa ara…", en: "Search pages…" })}
          style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, outline: "none", color: "inherit", fontSize: 12, fontWeight: 600 }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: 44, left: 0, right: 0, background: "var(--space-panel, #0f1c38)", border: "1px solid var(--space-line, #223454)", borderRadius: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.3)", overflow: "hidden", zIndex: 100 }}>
          {results.map((item) => (
            <button
              key={item.id}
              onMouseDown={() => choose(item)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: 0, background: "transparent", color: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" }}
            >
              {item.icon}
              {tt(item.label)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
