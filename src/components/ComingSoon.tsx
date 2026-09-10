import { Construction } from "lucide-react";
import { tt } from "../lib/i18n";

export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="orbit-card rise-in flex flex-col items-center gap-3 p-10 text-center">
      <Construction className="text-[var(--color-gold-400)]" size={28} />
      <p className="text-sm text-[var(--color-mist-300)]">
        {label} {tt({ tr: "bölümü henüz taşınmadı — sırada.", en: "hasn't been ported yet — it's next in line." })}
      </p>
    </div>
  );
}
