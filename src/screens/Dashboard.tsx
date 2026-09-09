import { useEffect, useState, type FormEvent } from "react";
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
  LogOut,
  Plus,
} from "lucide-react";
import { tt, type Dict } from "../lib/i18n";
import { supabase } from "../lib/supabase";

type Mode = "personal" | "business";

type ModuleDef = { icon: typeof CalendarDays; title: Dict; desc: Dict };

const personalModules: ModuleDef[] = [
  { icon: CalendarDays, title: { tr: "Zaman Akışı", en: "Time Flow" }, desc: { tr: "Randevular ve takvim tek yerde.", en: "Appointments and calendar in one place." } },
  { icon: CheckSquare, title: { tr: "Yapılacaklar", en: "To-Do" }, desc: { tr: "Görevlerin aşağıda, hesabına bağlı olarak.", en: "Your tasks below, tied to your account." } },
  { icon: Sparkles, title: { tr: "StyleSync", en: "StyleSync" }, desc: { tr: "Kombin ve stil önerileri.", en: "Outfit and style suggestions." } },
  { icon: Compass, title: { tr: "Keşfet", en: "Discover" }, desc: { tr: "Yakındaki mekan ve etkinlikler.", en: "Nearby places and events." } },
  { icon: StickyNote, title: { tr: "Boş Alan", en: "Open Space" }, desc: { tr: "Aklına geleni buraya yaz.", en: "Write down whatever's on your mind." } },
];

const businessModules: ModuleDef[] = [
  { icon: CalendarDays, title: { tr: "Randevu Takvimi", en: "Appointment Calendar" }, desc: { tr: "Personel bazlı görünüm.", en: "Staff-based view." } },
  { icon: Users, title: { tr: "Müşteriler", en: "Customers" }, desc: { tr: "CRM ve randevu geçmişi.", en: "CRM and appointment history." } },
  { icon: Megaphone, title: { tr: "Pazarlama", en: "Marketing" }, desc: { tr: "Kampanya ve hatırlatmalar.", en: "Campaigns and reminders." } },
  { icon: BarChart3, title: { tr: "Raporlar", en: "Reports" }, desc: { tr: "Doluluk, ciro, performans.", en: "Occupancy, revenue, performance." } },
  { icon: Settings, title: { tr: "İşletme Ayarları", en: "Business Settings" }, desc: { tr: "Saatler, hizmetler, fiyatlar.", en: "Hours, services, prices." } },
];

const copy = {
  modeSwitchPersonal: { tr: "Kişisel", en: "Personal" } satisfies Dict,
  modeSwitchBusiness: { tr: "İşletme", en: "Business" } satisfies Dict,
  eyebrowPersonal: { tr: "Bugün için akışın hazır", en: "Your flow is ready for today" } satisfies Dict,
  eyebrowBusiness: { tr: "İşletmen bugün nasıl gidiyor?", en: "How's your business doing today?" } satisfies Dict,
  headlinePersonal: { tr: "Hayatının akışı, tek noktada.", en: "The flow of your life, in one place." } satisfies Dict,
  headlineBusiness: { tr: "Randevuların ve müşterilerin, tek panelde.", en: "Your appointments and customers, in one panel." } satisfies Dict,
  subPersonal: { tr: "Takvim, görevler ve öneriler bir arada; hangi cihazdan girersen gir aynı yerden devam edersin.", en: "Calendar, tasks, and suggestions together — pick up where you left off on any device." } satisfies Dict,
  subBusiness: { tr: "Randevu, müşteri ve ekip yönetimi bir arada; demo veri yok, her rakam gerçek hesabından gelir.", en: "Appointments, customers, and team management together — no demo data, every number comes from your real account." } satisfies Dict,
  signOut: { tr: "Çıkış yap", en: "Sign out" } satisfies Dict,
  newTaskPlaceholder: { tr: "Yeni görev ekle…", en: "Add a new task…" } satisfies Dict,
  emptyTasks: { tr: "Henüz görev yok. İlk görevini ekle.", en: "No tasks yet. Add your first one." } satisfies Dict,
};

type Task = { id: string; title: string; completed: boolean };

function TaskList({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, completed")
      .order("created_at", { ascending: false });
    setTasks(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function addTask(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const { error } = await supabase.from("tasks").insert({ title: draft.trim(), user_id: userId });
    if (!error) {
      setDraft("");
      loadTasks();
    }
  }

  async function toggleTask(task: Task) {
    await supabase.from("tasks").update({ completed: !task.completed }).eq("id", task.id);
    loadTasks();
  }

  return (
    <div className="orbit-card rise-in mt-4 p-5" style={{ animationDelay: "440ms" }}>
      <form onSubmit={addTask} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={tt(copy.newTaskPlaceholder)}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--color-cyan-400)]"
        />
        <button
          type="submit"
          className="flex items-center justify-center rounded-xl bg-[var(--color-cyan-400)] px-3 text-[var(--color-space-950)]"
        >
          <Plus size={18} />
        </button>
      </form>

      <ul className="mt-4 flex flex-col gap-2">
        {!loading && tasks.length === 0 && (
          <li className="text-sm text-[var(--color-mist-500)]">{tt(copy.emptyTasks)}</li>
        )}
        {tasks.map((task) => (
          <li key={task.id}>
            <button
              onClick={() => toggleTask(task)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5"
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  task.completed ? "border-[var(--color-cyan-400)] bg-[var(--color-cyan-400)]" : "border-white/20"
                }`}
              />
              <span className={task.completed ? "text-[var(--color-mist-500)] line-through" : ""}>
                {task.title}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Dashboard({ userId }: { userId: string }) {
  const [mode, setMode] = useState<Mode>("personal");
  const modules = mode === "personal" ? personalModules : businessModules;

  return (
    <>
      <div className="starfield" aria-hidden="true" />
      <div className="orbit-ring orbit-spin" style={{ width: 720, height: 720, top: -260, right: -220 }} aria-hidden="true" />
      <div className="orbit-ring" style={{ width: 480, height: 480, top: -140, right: -100 }} aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <header className="flex items-center justify-between rise-in">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#38a9d4] to-[#756fe2]">
              <Flame size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-semibold tracking-tight">Planmoy</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="orbit-card flex gap-1 p-1">
              <button
                onClick={() => setMode("personal")}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "personal" ? "bg-[var(--color-cyan-400)] text-[var(--color-space-950)]" : "text-[var(--color-mist-300)] hover:text-[var(--color-mist-100)]"
                }`}
              >
                {tt(copy.modeSwitchPersonal)}
              </button>
              <button
                onClick={() => setMode("business")}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "business" ? "bg-[var(--color-cyan-400)] text-[var(--color-space-950)]" : "text-[var(--color-mist-300)] hover:text-[var(--color-mist-100)]"
                }`}
              >
                {tt(copy.modeSwitchBusiness)}
              </button>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              title={tt(copy.signOut)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[var(--color-mist-300)] hover:text-[var(--color-mist-100)]"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <section className="mt-16 sm:mt-24 max-w-2xl rise-in" style={{ animationDelay: "80ms" }}>
          <p className="text-sm font-medium text-[var(--color-cyan-300)]">
            {mode === "personal" ? tt(copy.eyebrowPersonal) : tt(copy.eyebrowBusiness)}
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            {mode === "personal" ? tt(copy.headlinePersonal) : tt(copy.headlineBusiness)}
          </h1>
          <p className="mt-4 text-[var(--color-mist-300)] text-base leading-relaxed">
            {mode === "personal" ? tt(copy.subPersonal) : tt(copy.subBusiness)}
          </p>
        </section>

        <section className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map(({ icon: Icon, title, desc }, i) => (
            <div key={tt(title)} className="orbit-card rise-in p-5 hover:border-[var(--color-cyan-400)]/40 transition-colors" style={{ animationDelay: `${140 + i * 60}ms` }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12">
                <Icon size={20} className="text-[var(--color-cyan-300)]" strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-medium">{tt(title)}</h3>
              <p className="mt-1 text-sm text-[var(--color-mist-500)]">{tt(desc)}</p>
            </div>
          ))}
        </section>

        {mode === "personal" && <TaskList userId={userId} />}
      </div>
    </>
  );
}
