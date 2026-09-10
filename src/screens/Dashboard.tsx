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
  Settings2,
  Package,
  UserCog,
  Award,
  ChartNoAxesCombined,
  Gauge,
  ShoppingCart,
  Coins,
  Activity,
  Target,
  Brain,
  Wallet,
  Clock3,
  Plus,
} from "lucide-react";
import { tt, type Dict } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { AppShell, type NavItem } from "../components/AppShell";
import { ComingSoon } from "../components/ComingSoon";

type AppMode = "personal" | "business";

const personalNav: NavItem[] = [
  { id: "flow", label: { tr: "Akışım", en: "My Flow" }, icon: Activity },
  { id: "calendar", label: { tr: "Zaman akışı", en: "Time Flow" }, icon: CalendarDays },
  { id: "tasks", label: { tr: "Yapılacaklar", en: "To-Do" }, icon: CheckSquare },
  { id: "stylesync", label: { tr: "StyleSync", en: "StyleSync" }, icon: Sparkles },
  { id: "discover", label: { tr: "Keşfet", en: "Discover" }, icon: Compass },
  { id: "sports", label: { tr: "Spor akışı", en: "Sports Flow" }, icon: Target },
  { id: "space", label: { tr: "Hobi ve hedefler", en: "Hobbies & goals" }, icon: Award },
  { id: "notes", label: { tr: "Boş Alan", en: "Open Space" }, icon: StickyNote },
  { id: "intelligence", label: { tr: "Yapay zeka", en: "Intelligence" }, icon: Brain },
];

const businessNav: NavItem[] = [
  { id: "overview", label: { tr: "Genel bakış", en: "Overview" }, icon: BarChart3 },
  { id: "appointments", label: { tr: "Randevular", en: "Appointments" }, icon: CalendarDays },
  { id: "customers", label: { tr: "Müşteriler", en: "Customers" }, icon: Users },
  { id: "staff", label: { tr: "Personel", en: "Staff" }, icon: UserCog },
  { id: "inventory", label: { tr: "Stok & ürünler", en: "Inventory" }, icon: Package },
  { id: "reports", label: { tr: "Raporlar & analiz", en: "Reports" }, icon: BarChart3 },
  { id: "marketing", label: { tr: "İletişim & pazarlama", en: "Marketing" }, icon: Megaphone },
  { id: "settings", label: { tr: "İşletme ayarları", en: "Settings" }, icon: Settings2 },
  { id: "loyalty", label: { tr: "Sadakat programı", en: "Loyalty" }, icon: Award },
  { id: "competition", label: { tr: "Rekabet analizi", en: "Competition" }, icon: ChartNoAxesCombined },
  { id: "performance", label: { tr: "Çalışan performansı", en: "Performance" }, icon: Gauge },
  { id: "supply", label: { tr: "Tedarik zinciri", en: "Supply chain" }, icon: ShoppingCart },
  { id: "pricing", label: { tr: "Kar marjı & fiyat", en: "Pricing" }, icon: Coins },
];

function StatCard({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: Dict; value: string }) {
  return (
    <div className="orbit-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-cyan-400)]/12">
        <Icon size={18} className="text-[var(--color-cyan-300)]" />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-[var(--color-mist-500)]">{tt(label)}</p>
    </div>
  );
}

type Task = { id: string; title: string; completed: boolean };

function TaskList({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("id, title, completed").order("created_at", { ascending: false });
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
    <div className="orbit-card p-5">
      <form onSubmit={addTask} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={tt({ tr: "Yeni görev ekle…", en: "Add a new task…" })}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--color-cyan-400)]"
        />
        <button type="submit" className="flex items-center justify-center rounded-xl bg-[var(--color-cyan-400)] px-3 text-[var(--color-space-950)]">
          <Plus size={18} />
        </button>
      </form>
      <ul className="mt-4 flex flex-col gap-2">
        {!loading && tasks.length === 0 && (
          <li className="text-sm text-[var(--color-mist-500)]">{tt({ tr: "Henüz görev yok.", en: "No tasks yet." })}</li>
        )}
        {tasks.map((task) => (
          <li key={task.id}>
            <button onClick={() => toggleTask(task)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  task.completed ? "border-[var(--color-cyan-400)] bg-[var(--color-cyan-400)]" : "border-white/20"
                }`}
              />
              <span className={task.completed ? "text-[var(--color-mist-500)] line-through" : ""}>{task.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PersonalFlow({ userId, go }: { userId: string; go: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-xl text-sm leading-relaxed text-[var(--color-mist-300)]">
        {tt({
          tr: "Takvim, görevler ve öneriler bir arada; hangi cihazdan girersen gir aynı yerden devam edersin.",
          en: "Calendar, tasks, and suggestions together — pick up where you left off on any device.",
        })}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button onClick={() => go("tasks")} className="orbit-card p-4 text-left hover:border-[var(--color-cyan-400)]/40">
          <CheckSquare className="text-[var(--color-cyan-300)]" size={18} />
          <p className="mt-3 text-sm font-medium">{tt({ tr: "Yapılacaklar", en: "To-Do" })}</p>
        </button>
        <button onClick={() => go("stylesync")} className="orbit-card p-4 text-left hover:border-[var(--color-cyan-400)]/40">
          <Sparkles className="text-[var(--color-cyan-300)]" size={18} />
          <p className="mt-3 text-sm font-medium">StyleSync</p>
        </button>
        <button onClick={() => go("discover")} className="orbit-card p-4 text-left hover:border-[var(--color-cyan-400)]/40">
          <Compass className="text-[var(--color-cyan-300)]" size={18} />
          <p className="mt-3 text-sm font-medium">{tt({ tr: "Keşfet", en: "Discover" })}</p>
        </button>
      </div>
      <TaskList userId={userId} />
    </div>
  );
}

function BusinessOverview() {
  const [counts, setCounts] = useState<{ appointments: number; customers: number } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("appointments").select("id", { count: "exact", head: true }),
      supabase.from("customers").select("id", { count: "exact", head: true }),
    ]).then(([a, c]) => setCounts({ appointments: a.count ?? 0, customers: c.count ?? 0 }));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={CalendarDays} label={{ tr: "Bugünkü randevular", en: "Today's appointments" }} value={String(counts?.appointments ?? "—")} />
        <StatCard icon={Users} label={{ tr: "Toplam müşteri", en: "Total customers" }} value={String(counts?.customers ?? "—")} />
        <StatCard icon={Clock3} label={{ tr: "Doluluk oranı", en: "Occupancy" }} value="—" />
        <StatCard icon={Wallet} label={{ tr: "Ciro tahmini", en: "Revenue estimate" }} value="—" />
      </div>
      <p className="text-xs text-[var(--color-mist-500)]">
        {tt({
          tr: "Henüz bir işletme kaydın yok — Randevular ve Müşteriler bölümlerinden ilk kayıtlarını ekleyerek bu paneli canlandırabilirsin.",
          en: "You don't have a business record yet — add your first entries from Appointments and Customers to bring this panel to life.",
        })}
      </p>
    </div>
  );
}

export function Dashboard({ userId }: { userId: string }) {
  const [appMode, setAppMode] = useState<AppMode>("personal");
  const [view, setView] = useState("flow");

  const navItems = appMode === "personal" ? personalNav : businessNav;
  const activeItem = navItems.find((i) => i.id === view) ?? navItems[0];

  function switchMode(next: AppMode) {
    setAppMode(next);
    setView(next === "personal" ? "flow" : "overview");
  }

  const modeSwitcher = (
    <div className="orbit-card flex gap-1 p-1">
      <button
        onClick={() => switchMode("personal")}
        className={`flex-1 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
          appMode === "personal" ? "bg-[var(--color-cyan-400)] text-[var(--color-space-950)]" : "text-[var(--color-mist-300)]"
        }`}
      >
        {tt({ tr: "Kişisel", en: "Personal" })}
      </button>
      <button
        onClick={() => switchMode("business")}
        className={`flex-1 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
          appMode === "business" ? "bg-[var(--color-cyan-400)] text-[var(--color-space-950)]" : "text-[var(--color-mist-300)]"
        }`}
      >
        {tt({ tr: "İşletme", en: "Business" })}
      </button>
    </div>
  );

  return (
    <AppShell
      navItems={navItems}
      activeId={view}
      onSelect={setView}
      title={tt(activeItem.label)}
      eyebrow={appMode === "personal" ? "PLANMOY · KİŞİSEL" : "PLANMOY BUSINESS"}
      onSignOut={() => supabase.auth.signOut()}
      modeSwitcher={modeSwitcher}
    >
      {appMode === "personal" && view === "flow" && <PersonalFlow userId={userId} go={setView} />}
      {appMode === "personal" && view === "tasks" && <TaskList userId={userId} />}
      {appMode === "personal" && view !== "flow" && view !== "tasks" && (
        <ComingSoon label={tt(activeItem.label)} />
      )}

      {appMode === "business" && view === "overview" && <BusinessOverview />}
      {appMode === "business" && view !== "overview" && <ComingSoon label={tt(activeItem.label)} />}
    </AppShell>
  );
}
