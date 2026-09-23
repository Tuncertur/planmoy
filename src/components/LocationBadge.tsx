import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { useLocationSource } from "../lib/useLocationSource";
import { tt } from "../lib/i18n";

function abbreviate(address: string): string {
  const firstWord = address.trim().split(",")[0]?.trim() ?? "";
  if (!firstWord) return "GPS";
  return firstWord.slice(0, 3).toLocaleUpperCase("tr");
}

export function LocationBadge({ userId }: { userId: string }) {
  const location = useLocationSource(userId);
  const [draft, setDraft] = useState(location.manualAddress);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    setDraft(location.manualAddress);
  }, [location.manualAddress]);

  async function saveAndClose(e: React.FormEvent) {
    e.preventDefault();
    location.setManualAddress(draft);
    await location.saveManualAddress();
    if (detailsRef.current) detailsRef.current.open = false;
  }

  const label =
    location.activeSource === "manual"
      ? abbreviate(location.manualAddress)
      : location.activeSource === "gps"
      ? tt({ tr: "GPS", en: "GPS" })
      : location.gpsStatus === "locating"
      ? tt({ tr: "Alınıyor…", en: "Locating…" })
      : tt({ tr: "Konum yok", en: "No location" });

  return (
    <details ref={detailsRef} className="location-badge">
      <summary className="location-badge-trigger" style={{ display: "flex", alignItems: "center", gap: 6, height: 38, padding: "0 12px" }}>
        <MapPin size={14} />
        <span style={{ fontSize: 11, fontWeight: 800 }}>{label}</span>
      </summary>
      <div className="theme-menu" role="dialog" style={{ minWidth: 260 }}>
        <div className="theme-menu-head">
          <div>
            <b>{tt({ tr: "Konumunu ayarla", en: "Set your location" })}</b>
            <small>{tt({ tr: "Tüm sayfalar buradan beslenir", en: "All pages use this" })}</small>
          </div>
        </div>
        <form onSubmit={saveAndClose} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 4px 8px" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={tt({ tr: "Örn. Kadıköy, İstanbul", en: "e.g. downtown" })}
            style={{ minHeight: 38, borderRadius: 9, border: "1px solid #cddfed", padding: "0 10px" }}
          />
          <button type="submit" className="primary-button">
            {tt({ tr: "Ara", en: "Search" })}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              location.useGps();
            }}
          >
            {tt({ tr: "GPS'e geri dön", en: "Use GPS instead" })}
          </button>
        </form>
      </div>
    </details>
  );
}
