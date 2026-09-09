import { useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  Sparkles,
  Compass,
  StickyNote,
  Users,
  BarChart3,
  Megaphone,
  Settings,
  Flame,
} from "lucide-react";

type Mode = "personal" | "business";

const personalModules = [
  { icon: CalendarDays, title: "Zaman Akışı", desc: "Randevular ve takvim tek yerde." },
  { icon: CheckSquare, title: "Yapılacaklar", desc: "Günlük ve haftalık görevler." },
  { icon: Sparkles, title: "StyleSync", desc: "Kombin ve stil önerileri." },
  { icon: Compass, title: "Keşfet", desc: "Yakındaki mekan ve etkinlikler." },
  { icon: StickyNote, title: "Boş Alan", desc: "Aklına geleni buraya yaz." },
];

const businessModules = [
  { icon: CalendarDays, title: "Randevu Takvimi", desc: "Personel bazlı görünüm." },
  { icon: Users, title: "Müşteriler", desc: "CRM ve randevu geçmişi." },
  { icon: Megaphone, title: "Pazarlama", desc: "Kampanya ve hatırlatmalar." },
  { icon: BarChart3, title: "Raporlar", desc: "Doluluk, ciro, performans." },
  { icon: Settings, title: "İşletme Ayarları", desc: "Saatler, hizmetler, fiyatlar." },
];

function App() {
  const [mode, setMode] = useState<Mode>("personal");
  const modules = mode === "personal" ? personalModules : businessModules;

  return (
    <>
      <div className="starfield" aria-hidden="true" />

      {/* Single deliberate orbital motif — anchors the hero, not repeated elsewhere */}
      <div
        className="orbit-ring orbit-spin"
        style={{ width: 720, height: 720, top: -260, right: -220 }}
        aria-hidden="true"
      />
      <div
        className="orbit-ring"
        style={{ width: 480, height: 480, top: -140, right: -100 }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <header className="flex items-center justify-between rise-in">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-ember-500)] to-[var(--color-gold-400)]">
              <Flame size={18} className="text-space-950" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-semibold tracking-tight">Planmoy</span>
          </div>

          <div className="orbit-card flex gap-1 p-1">
            <button
              onClick={() => setMode("personal")}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
                mode === "personal"
                  ? "bg-[var(--color-cyan-400)] text-[var(--color-space-950)]"
                  : "text-[var(--color-mist-300)] hover:text-[var(--color-mist-100)]"
              }`}
            >
              Kişisel
            </button>
            <button
              onClick={() => setMode("business")}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
                mode === "business"
                  ? "bg-[var(--color-cyan-400)] text-[var(--color-space-950)]"
                  : "text-[var(--color-mist-300)] hover:text-[var(--color-mist-100)]"
              }`}
            >
              İşletme
            </button>
          </div>
        </header>

        <section className="mt-16 sm:mt-24 max-w-2xl rise-in" style={{ animationDelay: "80ms" }}>
          <p className="text-sm font-medium text-[var(--color-cyan-300)]">
            {mode === "personal" ? "Bugün için akışın hazır" : "İşletmen bugün nasıl gidiyor?"}
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            {mode === "personal"
              ? "Hayatının akışı, tek noktada."
              : "Randevuların ve müşterilerin, tek panelde."}
          </h1>
          <p className="mt-4 text-[var(--color-mist-300)] text-base leading-relaxed">
            {mode === "personal"
              ? "Takvim, görevler ve öneriler bir arada; hangi cihazdan girersen gir aynı yerden devam edersin."
              : "Randevu, müşteri ve ekip yönetimi bir arada; demo veri yok, her rakam gerçek hesabından gelir."}
          </p>
        </section>

        <section className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="orbit-card rise-in p-5 hover:border-[var(--color-cyan-400)]/40 transition-colors"
              style={{ animationDelay: `${140 + i * 60}ms` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12">
                <Icon size={20} className="text-[var(--color-cyan-300)]" strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-medium">{title}</h3>
              <p className="mt-1 text-sm text-[var(--color-mist-500)]">{desc}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

export default App;
