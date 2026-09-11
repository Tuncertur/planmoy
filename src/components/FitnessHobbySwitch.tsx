import { useState } from "react";
import { Dumbbell, Palette } from "lucide-react";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/components/fitness-hobby-switch.tsx dosyasından
// birebir taşınmıştır.
export function FitnessHobbySwitch() {
  const [lane, setLane] = useState<"spor" | "hobi">("spor");
  return (
    <section className="fitness-hobby panel">
      <div>
        <p className="eyebrow blue-label">{tt({ tr: "Ayrı akışlar", en: "Separate lanes" })}</p>
        <h3>{lane === "spor" ? tt({ tr: "Spor ve antrenman", en: "Sports & training" }) : tt({ tr: "Hobiler ve üretim", en: "Hobbies & creating" })}</h3>
        <p>
          {lane === "spor"
            ? tt({ tr: "Gym, koşu ve antrenman planlarını hobilerinden ayrı takip et.", en: "Track gym, running, and training plans separately from your hobbies." })
            : tt({ tr: "El sanatları, müzik ve öğrenme hedeflerini kendi ritminde tut.", en: "Keep crafts, music, and learning goals at your own pace." })}
        </p>
      </div>
      <div className="fitness-tabs">
        <button className={lane === "spor" ? "selected" : ""} onClick={() => setLane("spor")}>
          <Dumbbell size={14} /> {tt({ tr: "Spor", en: "Sports" })}
        </button>
        <button className={lane === "hobi" ? "selected" : ""} onClick={() => setLane("hobi")}>
          <Palette size={14} /> {tt({ tr: "Hobiler", en: "Hobbies" })}
        </button>
      </div>
      <div className="fitness-lane-note">
        {lane === "spor"
          ? tt({ tr: "Antrenman yoğunluğunu, dinlenme günlerini ve gym hedeflerini takvimindeki boşluklarla eşleştir.", en: "Match training intensity, rest days, and gym goals with gaps in your calendar." })
          : tt({ tr: "Yeni bir hobi seç, küçük bir hedef koy ve bölgesel keşif önerilerini bu alana bağla.", en: "Pick a new hobby, set a small goal, and connect local discovery suggestions to it." })}
      </div>
    </section>
  );
}
