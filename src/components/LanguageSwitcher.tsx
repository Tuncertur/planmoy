import { useEffect, useState } from "react";
import { SUPPORTED_LANGS, getActiveLang, setActiveLang, subscribeLang, type Lang } from "../lib/i18n";

// Sağ üstte, tema butonunun yanında duran dil değiştirici. Etkin dil +
// bayrağı gösterir, tıklanınca diğer diller açılır. 8 dilin metinleri:
// tr/en kaynakta, diğer 6 dil src/i18n/<dil>.ts içinde (İngilizce metne göre aranır).
// Çevirisi olmayan metin İngilizce'ye düşer (tt() fallback zinciri).

const LANG_META: Record<Lang, { flag: string; label: string }> = {
  tr: { flag: "🇹🇷", label: "Türkçe" },
  en: { flag: "🇬🇧", label: "English" },
  de: { flag: "🇩🇪", label: "Deutsch" },
  fr: { flag: "🇫🇷", label: "Français" },
  es: { flag: "🇪🇸", label: "Español" },
  ar: { flag: "🇸🇦", label: "العربية" },
  ru: { flag: "🇷🇺", label: "Русский" },
  zh: { flag: "🇨🇳", label: "中文" },
};

export function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>(getActiveLang());

  useEffect(() => subscribeLang(() => setLang(getActiveLang())), []);

  return (
    <details className="theme-switcher lang-switcher">
      <summary className="theme-trigger">
        <span style={{ fontSize: 14 }}>{LANG_META[lang].flag}</span>
        <span>{LANG_META[lang].label}</span>
      </summary>
      <div className="theme-menu" role="dialog" aria-label="Dil seçenekleri">
        <div className="theme-menu-head">
          <div>
            <b>Dilini seç</b>
            <small>Choose your language</small>
          </div>
        </div>
        <div className="theme-options">
          {SUPPORTED_LANGS.map((l) => (
            <button key={l} className={lang === l ? "selected" : ""} onClick={() => setActiveLang(l)}>
              <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{LANG_META[l].flag}</span>
              <span className="theme-copy">
                <b>{LANG_META[l].label}</b>
              </span>
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
