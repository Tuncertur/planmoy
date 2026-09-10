import { useEffect, useState } from "react";
import { tt } from "../lib/i18n";

// Cihaz düzeyinde bir UI bayrağı — kişisel veri değil, PROJECT_RULES'daki
// "kalıcı veri localStorage'a yazılmaz" kuralının kapsamı dışında (tıpkı
// FireVibe'ın kendi 'offline' bayrağı gibi bir arayüz tercihi).
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem("planmoy-cookie-consent"));
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Çerez bildirimi"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 480,
        margin: "0 auto",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 12,
        background: "#111c34",
        border: "1px solid #334665",
        color: "#f3f7ff",
        fontSize: 12,
        boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
      }}
    >
      <span style={{ flex: 1 }}>
        {tt({
          tr: "Oturumunu açık tutmak için yalnızca gerekli teknik çerezleri kullanıyoruz.",
          en: "We use only essential technical cookies to keep you signed in.",
        })}
      </span>
      <button
        onClick={() => {
          localStorage.setItem("planmoy-cookie-consent", "1");
          setVisible(false);
        }}
        style={{
          flexShrink: 0,
          padding: "6px 12px",
          borderRadius: 8,
          border: 0,
          background: "linear-gradient(110deg,#38a9d4,#756fe2)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {tt({ tr: "Anladım", en: "Got it" })}
      </button>
    </div>
  );
}
