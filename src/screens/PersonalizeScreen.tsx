import { useState } from "react";
import { Award, Check, Dumbbell, Hotel, Music, Plus, Sparkles, Utensils } from "lucide-react";
import { supabase } from "../lib/supabase";
import { askAi } from "../lib/ai";
import { useLocationSource } from "../lib/useLocationSource";
import { tt } from "../lib/i18n";

// Kullanıcının isteğiyle eklendi: her konu başlığı için AI'ın TEK
// sorguda 10 soruluk çoktan seçmeli (3 seçenekli) bir test ürettiği,
// bölgeye duyarlı (örn. golf sahası olmayan şehirde golf sorulmaz)
// kişiselleştirme anketi. Cevaplar user_interests'e yazılır — böylece
// Tatil Planlama, AI Asistan gibi zaten kurulu yerler otomatik okur.

type Topic = { id: string; label: { tr: string; en: string }; icon: typeof Dumbbell };
const topics: Topic[] = [
  { id: "spor", label: { tr: "Spor", en: "Sports" }, icon: Dumbbell },
  { id: "otel", label: { tr: "Oteller", en: "Hotels" }, icon: Hotel },
  { id: "konser-muzik", label: { tr: "Konser & Müzik", en: "Concerts & Music" }, icon: Music },
  { id: "restoran-yemek", label: { tr: "Restoran & Yemek", en: "Restaurants & Food" }, icon: Utensils },
];

type Question = { question: string; options: [string, string, string] };

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("no-json");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export function PersonalizeScreen({ userId }: { userId: string }) {
  const location = useLocationSource(userId);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready" | "saved">("idle");
  const [manualNote, setManualNote] = useState("");
  const [savedTopics, setSavedTopics] = useState<string[]>([]);

  async function generateQuiz(topic: Topic) {
    setActiveTopic(topic);
    setQuestions([]);
    setAnswers({});
    setStatus("loading");
    const region = location.activeSource !== "none" ? (location.activeSource === "manual" ? location.manualAddress : tt({ tr: "kullanıcının GPS konumu", en: "user's GPS location" })) : tt({ tr: "belirtilmedi", en: "not specified" });
    const system =
      "Sen Planmoy'un kişiselleştirme anketi üreticisisin. SADECE geçerli bir JSON dizisi döndür, başka hiçbir metin yazma. " +
      "Format: [{\"question\":\"...\",\"options\":[\"...\",\"...\",\"...\"]}] — tam olarak 10 soru, her sorunun tam olarak 3 seçeneği olsun. " +
      "Sorular Türkçe olsun. Kullanıcının bölgesinde GERÇEKÇİ OLMAYAN seçenekler sunma (örn. golf sahası olmayan bir şehirde golf önerme, deniz olmayan bir şehirde sörf önerme) — bölgesel mantığı gözet.";
    const prompt = `Konu: ${tt(topic.label)}. Kullanıcının bölgesi: ${region}. Bu konuda kullanıcının zevklerini öğrenecek 10 soruluk bir test hazırla.`;
    const result = await askAi(system, prompt);
    if (!result.ok) {
      setStatus(result.reason === "missing-key" ? "error" : "error");
      return;
    }
    try {
      const parsed = extractJson(result.suggestion) as Question[];
      if (!Array.isArray(parsed) || !parsed.length) throw new Error("empty");
      setQuestions(parsed);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function saveAnswers() {
    if (!activeTopic) return;
    const rows = Object.entries(answers).map(([qIndex, answer]) => ({
      user_id: userId,
      name: answer,
      kind: activeTopic.id,
      intensity: questions[Number(qIndex)]?.question ?? "",
    }));
    if (manualNote.trim()) {
      rows.push({ user_id: userId, name: manualNote.trim(), kind: activeTopic.id, intensity: tt({ tr: "elle eklendi", en: "added manually" }) });
    }
    if (rows.length) await supabase.from("user_interests").insert(rows);
    setSavedTopics((v) => [...new Set([...v, activeTopic.id])]);
    setManualNote("");
    setStatus("saved");
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-xl text-sm leading-relaxed text-[var(--color-mist-300)]">
        {tt({
          tr: "Her konu için yapay zeka, bölgene uygun 10 soruluk bir test hazırlar (tek sorguda). Cevapların Tatil Planlama, Keşfet ve AI Asistan gibi tüm önerilerini kişiselleştirir. İstersen soruları hiç açmadan, doğrudan elle de yazabilirsin.",
          en: "For each topic, AI prepares a 10-question quiz tailored to your region (in a single query). Your answers personalize Trip Planning, Discover, and the AI Assistant. You can also skip the quiz and just type your preferences manually.",
        })}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {topics.map((topic) => {
          const Icon = topic.icon;
          const done = savedTopics.includes(topic.id);
          return (
            <button
              key={topic.id}
              onClick={() => generateQuiz(topic)}
              className={`orbit-card flex flex-col items-start gap-2 p-4 text-left hover:border-[var(--color-cyan-400)]/40 ${activeTopic?.id === topic.id ? "border-[var(--color-cyan-400)]/60" : ""}`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12">
                <Icon size={18} className="text-[var(--color-cyan-300)]" />
              </span>
              <span className="font-medium">{tt(topic.label)}</span>
              {done && (
                <span className="flex items-center gap-1 text-xs text-[var(--color-cyan-300)]">
                  <Check size={12} /> {tt({ tr: "Kaydedildi", en: "Saved" })}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTopic && status === "loading" && (
        <p className="text-sm text-[var(--color-mist-500)]">{tt({ tr: "Bölgene göre sorular hazırlanıyor…", en: "Preparing questions for your region…" })}</p>
      )}
      {activeTopic && status === "error" && (
        <p className="suggestion">
          {tt({ tr: "Test hazırlanamadı (AI sağlayıcısı henüz yapılandırılmamış olabilir). Aşağıdan elle de girebilirsin.", en: "Couldn't prepare the quiz (AI provider may not be configured yet). You can still type your preferences below." })}
        </p>
      )}

      {activeTopic && (status === "ready" || status === "saved") && questions.length > 0 && (
        <div className="orbit-card p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--color-cyan-300)]">
            <Sparkles size={14} /> {tt(activeTopic.label)} · {tt({ tr: "10 soru", en: "10 questions" })}
          </div>
          <div className="mt-3 flex flex-col gap-4">
            {questions.map((q, i) => (
              <div key={i}>
                <p className="text-sm font-medium">{q.question}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswers((v) => ({ ...v, [i]: opt }))}
                      className={`rounded-xl px-3 py-1.5 text-xs ${
                        answers[i] === opt ? "bg-[var(--color-cyan-400)] text-[var(--color-space-950)]" : "border border-white/10 bg-white/5"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <label className="mt-4 flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-mist-300)]">
              {tt({ tr: "Bunların dışında bir tercihin mi var? Elle yazabilirsin.", en: "Have a preference outside these? Type it yourself." })}
            </span>
            <input
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder={tt({ tr: "Örn. en az 4 yıldızlı otellerde kalırım / en uygun fiyatlı oteli göster", en: "e.g. I only stay in 4+ star hotels / show the cheapest hotel first" })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--color-cyan-400)]"
            />
          </label>

          <button onClick={saveAnswers} className="primary-button mt-3">
            <Plus size={16} /> {tt({ tr: "Cevapları kaydet", en: "Save answers" })}
          </button>
        </div>
      )}

      <div className="orbit-card flex items-start gap-3 p-4">
        <Award size={18} className="mt-0.5 shrink-0 text-[var(--color-gold-400)]" />
        <p className="text-xs text-[var(--color-mist-500)]">
          {tt({
            tr: "Testler AI tarafından üretilir; bölgedeki gerçek tesisleri garanti etmez, genel mantığa göre bölgeye uygun sorular sormaya çalışır. Yanlış bir seçenek görürsen görmezden gelip elle yazabilirsin.",
            en: "Quizzes are AI-generated; they don't guarantee real regional facilities, they try to ask region-appropriate questions using general reasoning. If you see an irrelevant option, ignore it and type your own instead.",
          })}
        </p>
      </div>

      <ArtistWatchlist userId={userId} />
    </div>
  );
}

function ArtistWatchlist({ userId }: { userId: string }) {
  const [artists, setArtists] = useState<string[]>([]);

  async function load() {
    const { data } = await supabase.from("user_interests").select("name").eq("user_id", userId).eq("kind", "konser-muzik");
    setArtists((data ?? []).map((i) => i.name));
  }
  useState(() => {
    load();
  });

  if (!artists.length) return null;

  return (
    <div className="orbit-card p-4">
      <p className="eyebrow blue-label">{tt({ tr: "Sanatçı takibi", en: "Artist watchlist" })}</p>
      <p className="mt-1 text-xs text-[var(--color-mist-500)]">
        {tt({
          tr: "Otomatik arka plan bildirimi için henüz altyapımız yok — ama Kişiselleştir'de kaydettiğin her cevap için hazır bir arama linki hazırladık, tek tıkla kontrol edebilirsin.",
          en: "We don't have automatic background alerts yet — but for each saved answer, here's a ready search link so you can check with one click.",
        })}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {artists.map((a) => (
          <a
            key={a}
            href={`https://www.google.com/search?q=${encodeURIComponent(`${a} konser bileti 2026`)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-cyan-300)] hover:bg-white/10"
          >
            {a} {tt({ tr: "konserini kontrol et", en: "— check concerts" })}
          </a>
        ))}
      </div>
    </div>
  );
}
