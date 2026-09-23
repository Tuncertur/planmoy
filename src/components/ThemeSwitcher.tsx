import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";

export type Theme = "violet" | "orbit" | "ocean" | "mono" | "sun" | "aurora";
const themes: { id: Theme; label: string; note: string; swatches: string[] }[] = [
  { id: "violet", label: "Violet", note: "Mavi-mor gradyan, varsayılan", swatches: ["#2a6fa8", "#5b4fc4", "#5eead4"] },
  { id: "orbit", label: "Solar Orbit", note: "Derin uzay ve cyan", swatches: ["#081126", "#46c7e8", "#9185ff"] },
  { id: "ocean", label: "Ocean Clean", note: "Mavi ve beyaz", swatches: ["#f5faff", "#1769c2", "#61c6dc"] },
  { id: "mono", label: "Mono Focus", note: "Siyah ve beyaz", swatches: ["#090909", "#ffffff", "#a4a4a4"] },
  { id: "sun", label: "Sun Signal", note: "Sarı, lacivert ve beyaz", swatches: ["#fffbee", "#102a56", "#f2bd27"] },
  { id: "aurora", label: "Aurora Calm", note: "Mor, mint ve gece", swatches: ["#10122b", "#9d8cff", "#5ee0bd"] },
];

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("violet");

  useEffect(() => {
    const saved = window.localStorage.getItem("planmoy-theme-v2") as Theme | null;
    const next = themes.some((item) => item.id === saved) ? saved! : "violet";
    setTheme(next);
    document.documentElement.dataset["theme"] = next;
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    document.documentElement.dataset["theme"] = next;
    window.localStorage.setItem("planmoy-theme-v2", next);
  }

  const current = themes.find((item) => item.id === theme) ?? themes[0]!;

  return (
    <details className="theme-switcher">
      <summary className="theme-trigger">
        <Palette size={16} />
        <span>Tema</span>
        <i style={{ background: current.swatches[1] }} />
      </summary>
      <div className="theme-menu" role="dialog" aria-label="Görünüm temaları">
        <div className="theme-menu-head">
          <div>
            <b>Görünümünü seç</b>
            <small>Her sayfada kaydedilir</small>
          </div>
        </div>
        <div className="theme-options">
          {themes.map((item) => (
            <button key={item.id} className={theme === item.id ? "selected" : ""} onClick={() => choose(item.id)}>
              <span className="theme-swatches">
                {item.swatches.map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </span>
              <span className="theme-copy">
                <b>{item.label}</b>
                <small>{item.note}</small>
              </span>
              {theme === item.id && <Check size={15} />}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
