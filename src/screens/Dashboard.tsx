import { useEffect, useState, useRef } from "react";
import {
  ArrowUpRight, CalendarDays, Check, ChevronRight, Compass, FileText,
  HeartPulse, LayoutDashboard, ListChecks, Plus, Scissors, Settings2,
  Sparkles, Users, WandSparkles, Dumbbell, Brain, StickyNote,
} from "lucide-react";
import { tt, type Dict } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { askAi } from "../lib/ai";
import { NotesScreen } from "./NotesScreen";
import { DiscoverScreen } from "./DiscoverScreen";
import { ComingSoon } from "../components/ComingSoon";

// Bu ekran FireVibe'ın gerçek src/routes/index.tsx dosyasından (Home
// bileşeni) birebir taşınmıştır — class isimleri, bölüm sırası ve kopya
// metinler kaynağa sadık kalınarak yazıldı.

type Mode = "personal" | "business";
type ViewId =
  | "flow" | "calendar" | "tasks" | "stylesync" | "discover"
  | "sports" | "events" | "space" | "notes" | "intelligence" | "personal-tools";

const navItems: { id: ViewId; icon: React.ReactNode; label: Dict }[] = [
  { id: "flow", icon: <LayoutDashboard size={17} />, label: { tr: "Genel bakış", en: "Overview" } },
  { id: "calendar", icon: <CalendarDays size={17} />, label: { tr: "Zaman akışı", en: "Time flow" } },
  { id: "tasks", icon: <ListChecks size={17} />, label: { tr: "Yapılacaklar", en: "Tasks" } },
  { id: "stylesync", icon: <WandSparkles size={17} />, label: { tr: "StyleSync", en: "StyleSync" } },
  { id: "discover", icon: <Compass size={17} />, label: { tr: "Keşfet", en: "Discover" } },
  { id: "sports", icon: <Dumbbell size={17} />, label: { tr: "Spor akışı", en: "Sports flow" } },
  { id: "events", icon: <Users size={17} />, label: { tr: "Etkinlikler", en: "Events" } },
  { id: "space", icon: <FileText size={17} />, label: { tr: "Hobi ve hedefler", en: "Hobbies & goals" } },
  { id: "notes", icon: <StickyNote size={17} />, label: { tr: "Boş Alan", en: "Empty space" } },
  { id: "intelligence", icon: <Brain size={17} />, label: { tr: "Yapay zeka", en: "Intelligence" } },
];

function NavItem({
  item,
  active,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  item: (typeof navItems)[number];
  active: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  return (
    <button
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`nav-item ${active ? "active" : ""}`}
      style={{ width: "100%", cursor: "grab" }}
      title={tt({ tr: "Sürükleyerek sırasını değiştirebilirsin", en: "Drag to reorder" })}
    >
      {item.icon}
      <span>{tt(item.label)}</span>
    </button>
  );
}

export function Dashboard({ userId }: { userId: string }) {
  const [mode, setMode] = useState<Mode>("personal");
  const [view, setView] = useState<ViewId>("flow");
  const [dashboard, setDashboard] = useState<{ todayTasks: number; todayAppointments: number } | null>(null);
  const [order, setOrder] = useState<ViewId[]>(navItems.map((n) => n.id));
  const dragId = useRef<ViewId | null>(null);

  useEffect(() => {
    supabase
      .from("user_preferences")
      .select("personal_nav_order")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const saved = data?.personal_nav_order as ViewId[] | undefined;
        if (Array.isArray(saved) && saved.length) {
          const known = navItems.map((n) => n.id);
          const merged = [...saved.filter((id) => known.includes(id)), ...known.filter((id) => !saved.includes(id))];
          setOrder(merged);
        }
      });
  }, [userId]);

  async function persistOrder(next: ViewId[]) {
    setOrder(next);
    await supabase.from("user_preferences").upsert({ user_id: userId, personal_nav_order: next, updated_at: new Date().toISOString() });
  }

  function handleDrop(targetId: ViewId) {
    if (!dragId.current || dragId.current === targetId) return;
    const from = order.indexOf(dragId.current);
    const to = order.indexOf(targetId);
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, dragId.current);
    persistOrder(next);
    dragId.current = null;
  }

  const orderedNavItems = order.map((id) => navItems.find((n) => n.id === id)).filter(Boolean) as typeof navItems;

  useEffect(() => {
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("completed", false)
      .then(({ count }) => setDashboard({ todayTasks: count ?? 0, todayAppointments: 0 }));
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setView("flow");
  }

  return (
    <div className="app-shell overview-blue home-choice">
      <aside className="sidebar">
        <a href="/" className="brand" onClick={(e) => e.preventDefault()}>
          plan<span>moy</span>
          <i />
        </a>
        <div className="workspace">
          <span className="avatar-mark">PM</span>
          <div>
            <strong>Planmoy</strong>
            <small>{mode === "personal" ? tt({ tr: "Kişisel alan", en: "Personal space" }) : tt({ tr: "İşletme alanı", en: "Business space" })}</small>
          </div>
        </div>
        <nav className="side-nav" aria-label="Ana menü">
          {orderedNavItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={view === item.id}
              onClick={() => setView(item.id)}
              onDragStart={() => (dragId.current = item.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(item.id)}
            />
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p style={{ fontSize: 10, color: "var(--space-muted, #7893ad)", padding: "0 12px 8px" }}>
            {tt({ tr: "İpucu: Menü öğelerini sürükleyerek sırasını değiştirebilirsin — tercihin hesabına kaydedilir.", en: "Tip: drag menu items to reorder them — your preference is saved to your account." })}
          </p>
          <div className="fire-note">
            <Sparkles size={16} />
            <span>
              {tt({ tr: "Akışını", en: "Your flow" })}
              <br />
              <b>{tt({ tr: "netleştir.", en: "made clear." })}</b>
            </span>
          </div>
          <span className="side-caption">Planmoy · cross-platform</span>
        </div>
      </aside>

      <main className="main-canvas">
        <header className="topbar">
          <div>
            <p className="eyebrow">Planmoy</p>
            <h1>{tt(navItems.find((n) => n.id === view)?.label ?? { tr: "Genel bakış", en: "Overview" })}</h1>
          </div>
          <div className="top-actions">
            <span className="platform-note">
              <i /> Web · Android · iOS
            </span>
          </div>
        </header>

        <section className="mode-hero">
          <div>
            <p className="eyebrow blue-label">{mode === "personal" ? tt({ tr: "KİŞİSEL AKIŞ", en: "PERSONAL FLOW" }) : tt({ tr: "İŞLETME AKIŞI", en: "BUSINESS FLOW" })}</p>
            <h2>
              {mode === "personal" ? (
                <>
                  {tt({ tr: "Günün akışı,", en: "Your day," })}
                  <br />
                  {tt({ tr: "senin ritminde.", en: "in your rhythm." })}
                </>
              ) : (
                <>
                  {tt({ tr: "İşletmen için", en: "A clearer flow" })}
                  <br />
                  {tt({ tr: "daha net bir akış.", en: "for your business." })}
                </>
              )}
            </h2>
            <p className="intro">
              {mode === "personal"
                ? tt({ tr: "Randevular, görevler, stil ve keşif önerileri tek bir sakin çalışma alanında.", en: "Appointments, tasks, style, and discovery in one calm workspace." })
                : tt({ tr: "Takvim, hizmetler, ekip ve danışan deneyimi için ihtiyacın olan sade panel.", en: "A focused panel for calendars, services, teams, and clients." })}
            </p>
          </div>
          <div className="flow-orb">
            <span className="orb-ring" />
            <span className="orb-dot dot-one" />
            <span className="orb-dot dot-two" />
            <b>FLOW</b>
          </div>
        </section>

        <section className="mode-switch" aria-label="Nasıl kullanacaksın?">
          <button className={mode === "personal" ? "selected" : ""} onClick={() => switchMode("personal")}>
            <span className="mode-icon">
              <HeartPulse size={20} />
            </span>
            <span>
              <strong>{tt({ tr: "Kişisel alan", en: "Personal space" })}</strong>
              <small>{tt({ tr: "Takvimini, görevlerini ve günlük akışını yönet.", en: "Manage your calendar, tasks and daily flow." })}</small>
            </span>
            <ChevronRight size={17} />
          </button>
          <button className={mode === "business" ? "selected" : ""} onClick={() => switchMode("business")}>
            <span className="mode-icon">
              <Users size={20} />
            </span>
            <span>
              <strong>{tt({ tr: "İşletme alanı", en: "Business space" })}</strong>
              <small>{tt({ tr: "Randevularını, ekibini ve müşteri akışını yönet.", en: "Manage appointments, team and customer flow." })}</small>
            </span>
            <ChevronRight size={17} />
          </button>
        </section>

        {mode === "personal" && view === "flow" && (
          <PersonalView dashboard={dashboard} go={setView} />
        )}
        {mode === "business" && view === "flow" && <BusinessView />}

        {view === "tasks" && <PanelWrap><TasksInline userId={userId} /></PanelWrap>}
        {view === "notes" && <PanelWrap><NotesScreen userId={userId} /></PanelWrap>}
        {view === "discover" && <PanelWrap><DiscoverScreen /></PanelWrap>}
        {!["flow", "tasks", "notes", "discover"].includes(view) && (
          <PanelWrap>
            <ComingSoon label={tt(navItems.find((n) => n.id === view)?.label ?? { tr: "", en: "" })} />
          </PanelWrap>
        )}

        <footer>
          <span className="brand small">
            plan<span>moy</span>
            <i />
          </span>
          <span>{tt({ tr: "Kişisel hayat ve işletme akışı, tek noktada.", en: "One clear flow for life and business." })}</span>
        </footer>
      </main>
    </div>
  );
}

function PanelWrap({ children }: { children: React.ReactNode }) {
  return <section style={{ marginTop: 18 }}>{children}</section>;
}

function PanelHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
      </div>
      {action}
    </div>
  );
}

function PersonalView({
  dashboard,
  go,
}: {
  dashboard: { todayTasks: number; todayAppointments: number } | null;
  go: (id: ViewId) => void;
}) {
  const [aiState, setAiState] = useState<"idle" | "loading" | "ready" | "missing-key" | "error">("idle");
  const [aiText, setAiText] = useState("");

  async function askFlow() {
    setAiState("loading");
    const result = await askAi(
      "Sen Planmoy kişisel akış asistanısın. Türkçe yaz, en fazla 2 cümle kullan. Takvim, görevler ve günlük denge arasından tek bir uygulanabilir öneri ver.",
      "Kullanıcının bugünkü odağı: takvim, görevler ve kişisel bakım dengesi."
    );
    if (!result.ok) {
      setAiState(result.reason === "missing-key" ? "missing-key" : "error");
      return;
    }
    setAiText(result.suggestion);
    setAiState("ready");
  }

  return (
    <>
      <section className="today-focus-banner">
        <div>
          <p className="eyebrow blue-label">{tt({ tr: "BUGÜNÜN ODAĞI", en: "TODAY'S FOCUS" })}</p>
          <h2>{dashboard ? `${dashboard.todayTasks} ${tt({ tr: "görev seni bekliyor.", en: "tasks are waiting for you." })}` : tt({ tr: "Akışını tek bakışta netleştir.", en: "See your flow at a glance." })}</h2>
          <p>{tt({ tr: "Önce en önemli adımı seç, kalanını Planmoy senin için sakinleştirsin.", en: "Choose the most important step first; Planmoy will simplify the rest." })}</p>
        </div>
        <button className="primary-button" onClick={() => go("tasks")}>
          {tt({ tr: "Bugünü planla", en: "Plan today" })} <ArrowUpRight size={15} />
        </button>
      </section>

      <section className="personal-stat-grid">
        <article className="personal-stat">
          <span className="stat-icon">
            <ListChecks size={16} />
          </span>
          <small>{tt({ tr: "Bugünün görevleri", en: "Today's tasks" })}</small>
          <strong>{dashboard ? dashboard.todayTasks : "—"}</strong>
          <em>{tt({ tr: "Önceliklerini seç", en: "Choose your priorities" })}</em>
        </article>
        <article className="personal-stat">
          <span className="stat-icon">
            <CalendarDays size={16} />
          </span>
          <small>{tt({ tr: "Yaklaşan randevular", en: "Upcoming appointments" })}</small>
          <strong>—</strong>
          <em>{tt({ tr: "Yaklaşan randevu yok", en: "No upcoming appointments" })}</em>
        </article>
        <article className="personal-stat">
          <span className="stat-icon">
            <Sparkles size={16} />
          </span>
          <small>{tt({ tr: "Fire puanı", en: "Fire points" })}</small>
          <strong>—</strong>
          <em>{tt({ tr: "Henüz veri yok", en: "No data yet" })}</em>
        </article>
        <article className="personal-stat">
          <span className="stat-icon">
            <HeartPulse size={16} />
          </span>
          <small>{tt({ tr: "Akış dengesi", en: "Flow balance" })}</small>
          <strong>—</strong>
          <em>{tt({ tr: "Henüz veri yok", en: "No data yet" })}</em>
        </article>
      </section>

      <section className="overview-grid personal-main-grid">
        <article className="panel schedule-panel">
          <PanelHeading eyebrow="Zaman akışı" title={tt({ tr: "Yaklaşanlar", en: "Upcoming" })} action={<a onClick={() => go("calendar")}>{tt({ tr: "Takvime git", en: "Go to calendar" })} <ArrowUpRight size={14} /></a>} />
          <div className="appointment-list">
            <p className="empty-schedule">{tt({ tr: "Giriş yaptıktan sonra yaklaşan randevuların burada görünür.", en: "Your upcoming appointments will appear here." })}</p>
          </div>
        </article>
        <article className="panel focus-panel">
          <span className="focus-envelope" aria-hidden="true">✦</span>
          <PanelHeading eyebrow={tt({ tr: "Yapay zeka", en: "Intelligence" })} title={tt({ tr: "Bugünün dengesi", en: "Today's balance" })} />
          <div className="focus-score">
            <strong>—</strong>
            <span>
              / 100<br />
              <small>{tt({ tr: "akış puanı", en: "flow score" })}</small>
            </span>
          </div>
          <p className="focus-copy">{tt({ tr: "Takvim, görevler ve kişisel bakım dengeni Gemini ile değerlendir.", en: "Let Gemini weigh your calendar, tasks, and personal balance." })}</p>
          <button className="primary-button" onClick={askFlow} disabled={aiState === "loading"}>
            {aiState === "loading" ? tt({ tr: "Düşünüyor…", en: "Thinking…" }) : tt({ tr: "Yapay zeka önerisi al", en: "Get AI advice" })} <Sparkles size={16} />
          </button>
          {aiState === "missing-key" && (
            <p className="suggestion" role="status">
              {tt({ tr: "AI sağlayıcısı (Gemini) henüz yapılandırılmadı.", en: "The AI provider (Gemini) isn't configured yet." })}
            </p>
          )}
          {aiState === "error" && (
            <p className="suggestion" role="status">{tt({ tr: "Öneri alınamadı, tekrar dene.", en: "Couldn't get a suggestion, try again." })}</p>
          )}
          {aiState === "ready" && (
            <p className="suggestion" role="status">{aiText}</p>
          )}
        </article>
      </section>

      <section className="quick-actions-personal">
        <div>
          <p className="eyebrow blue-label">{tt({ tr: "HIZLI BAŞLANGIÇ", en: "QUICK START" })}</p>
          <h2>{tt({ tr: "Akışına bir adım ekle.", en: "Add a step to your flow." })}</h2>
        </div>
        <div className="quick-actions-personal-list">
          <a onClick={() => go("tasks")}>
            <span><ListChecks size={17} /></span>
            <b>{tt({ tr: "Görev ekle", en: "Add task" })}</b>
            <small>{tt({ tr: "Bugünü planla", en: "Plan today" })}</small>
            <ArrowUpRight size={14} />
          </a>
          <a onClick={() => go("calendar")}>
            <span><CalendarDays size={17} /></span>
            <b>{tt({ tr: "Randevu ekle", en: "Add appointment" })}</b>
            <small>{tt({ tr: "Takvimine bağla", en: "Connect to calendar" })}</small>
            <ArrowUpRight size={14} />
          </a>
          <a onClick={() => go("stylesync")}>
            <span><WandSparkles size={17} /></span>
            <b>{tt({ tr: "Stil önerisi iste", en: "Ask for a style idea" })}</b>
            <small>{tt({ tr: "StyleSync ile keşfet", en: "Explore with StyleSync" })}</small>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </section>

      <section className="recommendation-band">
        <div>
          <p className="eyebrow blue-label">{tt({ tr: "ÖNCELİKLİ KONU", en: "PRIORITY" })}</p>
          <h2>
            {tt({ tr: "Bugün sağlık ve bakım", en: "Health and care stand out" })}
            <br />
            <strong>{tt({ tr: "öne çıkıyor.", en: "today." })}</strong>
          </h2>
          <p>{tt({ tr: "İlk görüşmen yaklaşırken en işine yarayacak üç alan.", en: "Three areas that will help most as your first meeting approaches." })}</p>
        </div>
        <div className="recommendation-buttons">
          <a onClick={() => go("calendar")} className="recommendation-button">
            <HeartPulse size={18} />
            <b>{tt({ tr: "Sağlık randevuları", en: "Health appointments" })}</b>
            <small>{tt({ tr: "Görüşmelerini düzenle", en: "Organize your visits" })}</small>
          </a>
          <a onClick={() => go("stylesync")} className="recommendation-button">
            <Scissors size={18} />
            <b>{tt({ tr: "Bakım planı", en: "Care plan" })}</b>
            <small>{tt({ tr: "Stil ve kuaför", en: "Style and hair" })}</small>
          </a>
          <a onClick={() => go("intelligence")} className="recommendation-button">
            <Sparkles size={18} />
            <b>{tt({ tr: "Akıllı öneriler", en: "Smart suggestions" })}</b>
            <small>{tt({ tr: "Bugünü birlikte planla", en: "Plan today together" })}</small>
          </a>
        </div>
      </section>
    </>
  );
}

function BusinessView() {
  return (
    <>
      <section className="business-stats">
        <article className="stat-card">
          <CalendarDays />
          <span>{tt({ tr: "Bugünkü randevular", en: "Today's appointments" })}</span>
          <strong>—</strong>
          <small>{tt({ tr: "Henüz işletme kaydın yok", en: "No business record yet" })}</small>
        </article>
        <article className="stat-card">
          <Users />
          <span>{tt({ tr: "Aktif danışanlar", en: "Active clients" })}</span>
          <strong>—</strong>
          <small>{tt({ tr: "Henüz veri yok", en: "No data yet" })}</small>
        </article>
        <article className="stat-card">
          <Settings2 />
          <span>{tt({ tr: "Doluluk oranı", en: "Occupancy" })}</span>
          <strong>—</strong>
          <small>{tt({ tr: "Henüz veri yok", en: "No data yet" })}</small>
        </article>
      </section>
      <section className="business-grid">
        <article className="panel schedule-panel">
          <PanelHeading eyebrow={tt({ tr: "İşletme takvimi", en: "Business calendar" })} title={tt({ tr: "Bugünün akışı", en: "Today's flow" })} />
          <p className="empty-schedule">{tt({ tr: "Henüz randevu kaydı yok.", en: "No appointments recorded yet." })}</p>
        </article>
        <article className="panel business-ai">
          <p className="eyebrow blue-label">{tt({ tr: "Yapay zeka · işletme", en: "Intelligence · business" })}</p>
          <h3>{tt({ tr: "Yoğunluğunu", en: "Manage your" })}<br />{tt({ tr: "daha iyi yönet.", en: "workload better." })}</h3>
          <p>{tt({ tr: "AI sağlayıcısı henüz yapılandırılmadı.", en: "AI provider isn't configured yet." })}</p>
        </article>
      </section>
    </>
  );
}

// Görev kategorileri — planmoy_tasarim.txt Bölüm 2 taksonomisiyle VE
// FireVibe'ın gerçek src/routes/tasks.tsx dosyasındaki taskCategories
// listesiyle birebir aynı. Belgede "EKSİK YAPMA!" diye özellikle
// işaretlenmiş bir bölümdü.
const taskCategories = [
  "İş görevleri",
  "Ev görevleri",
  "Kişisel görevler",
  "Sosyal görevler",
  "Sağlık görevleri",
  "Yapay zeka önerileri",
] as const;
type TaskPeriod = "today" | "week" | "month";

function TasksInline({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<
    { id: string; title: string; completed: boolean; category: string; period: string; pinned: boolean }[]
  >([]);
  const [draft, setDraft] = useState("");
  const [newCategory, setNewCategory] = useState<(typeof taskCategories)[number]>("Kişisel görevler");
  const [filter, setFilter] = useState<TaskPeriod>("today");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  async function load() {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, completed, category, period, pinned")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setTasks(data ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    await supabase.from("tasks").insert({ title: draft.trim(), user_id: userId, category: newCategory, period: filter });
    setDraft("");
    load();
  }
  async function toggle(id: string, completed: boolean) {
    await supabase.from("tasks").update({ completed: !completed }).eq("id", id);
    load();
  }
  async function pin(id: string, pinned: boolean) {
    await supabase.from("tasks").update({ pinned: !pinned }).eq("id", id);
    load();
  }

  const visible = tasks.filter((t) => t.period === filter && (categoryFilter === "all" || t.category === categoryFilter));

  return (
    <section className="panel tasks-panel">
      <PanelHeading eyebrow={tt({ tr: "Yapılacaklar", en: "Tasks" })} title={tt({ tr: "Bugünün küçük adımları", en: "Today's small steps" })} />

      <div className="task-filter">
        <button className={filter === "today" ? "selected" : ""} onClick={() => setFilter("today")}>{tt({ tr: "Bugün", en: "Today" })}</button>
        <button className={filter === "week" ? "selected" : ""} onClick={() => setFilter("week")}>{tt({ tr: "Hafta", en: "Week" })}</button>
        <button className={filter === "month" ? "selected" : ""} onClick={() => setFilter("month")}>{tt({ tr: "Ay", en: "Month" })}</button>
      </div>

      <form onSubmit={add} className="inline-add">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tt({ tr: "Yeni görev ekle", en: "Add a new task" })} />
        <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as (typeof taskCategories)[number])}>
          {taskCategories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button aria-label="Görev ekle"><Plus size={17} /></button>
      </form>

      <div className="task-controls">
        <label>
          {tt({ tr: "Görev kategorisi", en: "Task category" })}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">{tt({ tr: "Tüm kategoriler", en: "All categories" })}</option>
            {taskCategories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div className="task-list task-page-list">
        {visible.map((task) => (
          <div key={task.id} className={`task ${task.completed ? "is-done" : ""}`}>
            <button className="task-toggle" onClick={() => toggle(task.id, task.completed)}>
              <span className="task-check">{task.completed && <Check size={13} />}</span>
              <span>{task.title}</span>
            </button>
            <small>{task.category}</small>
            <button className={`task-pin ${task.pinned ? "is-pinned" : ""}`} onClick={() => pin(task.id, task.pinned)} aria-label="Sabitle">
              📌
            </button>
          </div>
        ))}
        {visible.length === 0 && <p className="task-empty"><span>{tt({ tr: "Bu dönemde görev yok.", en: "No tasks in this period." })}</span></p>}
      </div>
    </section>
  );
}
