import { useEffect, useState, type FormEvent } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";

type Tone = "sky" | "sun" | "mint" | "rose";
type Note = { id: string; title: string; body: string; tag: string; tone: Tone; created_at: string };

const toneStyles: Record<Tone, string> = {
  sky: "border-[#38a9d4]/40 bg-[#38a9d4]/10",
  sun: "border-[var(--color-gold-400)]/40 bg-[var(--color-gold-400)]/10",
  mint: "border-emerald-400/40 bg-emerald-400/10",
  rose: "border-rose-400/40 bg-rose-400/10",
};

export function NotesScreen({ userId }: { userId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("#fikir");
  const [tone, setTone] = useState<Tone>("sky");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("notes").select("*").order("created_at", { ascending: false });
    setNotes((data as Note[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const { error } = await supabase.from("notes").insert({
      title: title.trim(),
      body: body.trim(),
      tag: tag.trim() || "#not",
      tone,
      user_id: userId,
    });
    if (!error) {
      setTitle("");
      setBody("");
      setTag("#fikir");
      setComposerOpen(false);
      load();
    }
  }

  async function remove(id: string) {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((v) => v.filter((n) => n.id !== id));
  }

  const filtered = notes.filter((n) =>
    `${n.title} ${n.body} ${n.tag}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
          <Search size={15} className="text-[var(--color-mist-500)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tt({ tr: "Notlarda ara", en: "Search notes" })}
            className="bg-transparent outline-none"
          />
        </label>
        <button
          onClick={() => setComposerOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#38a9d4] to-[#756fe2] px-4 py-2 text-sm font-medium text-white"
        >
          <Plus size={16} /> {tt({ tr: "Not yaz", en: "Write a note" })}
        </button>
      </div>

      {composerOpen && (
        <form onSubmit={addNote} className="orbit-card flex flex-col gap-3 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tt({ tr: "Başlık", en: "Title" })}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={tt({ tr: "Aklına geleni yaz…", en: "Write what's on your mind…" })}
            rows={3}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
          />
          <div className="flex gap-2">
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            />
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            >
              <option value="sky">{tt({ tr: "Mavi", en: "Blue" })}</option>
              <option value="sun">{tt({ tr: "Sarı", en: "Yellow" })}</option>
              <option value="mint">{tt({ tr: "Nane", en: "Mint" })}</option>
              <option value="rose">{tt({ tr: "Gül", en: "Rose" })}</option>
            </select>
          </div>
          <button type="submit" className="rounded-xl bg-[var(--color-cyan-400)] py-2 text-sm font-medium text-[var(--color-space-950)]">
            {tt({ tr: "Kaydet", en: "Save" })}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-[var(--color-mist-500)]">
            {tt({ tr: "Henüz not yok.", en: "No notes yet." })}
          </p>
        )}
        {filtered.map((note) => (
          <article key={note.id} className={`orbit-card border p-4 ${toneStyles[note.tone]}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{note.title}</h3>
              <button onClick={() => remove(note.id)} aria-label="Sil" className="text-[var(--color-mist-500)] hover:text-[#ff8a80]">
                <Trash2 size={14} />
              </button>
            </div>
            <p className="mt-1 text-sm text-[var(--color-mist-300)]">{note.body}</p>
            <span className="mt-2 inline-block text-xs text-[var(--color-cyan-300)]">{note.tag}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
