import { useEffect, useState, useRef } from "react";
import {
  ArrowUpRight, CalendarDays, Check, ChevronRight, Compass, FileText,
  HeartPulse, LayoutDashboard, ListChecks, Plus, Scissors, Settings2,
  Sparkles, Users, WandSparkles, Dumbbell, Brain, StickyNote, MapPin,
  Lightbulb, Flame, Layers3, UserCog,
} from "lucide-react";
import { tt, type Dict } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { askAi } from "../lib/ai";
import { NotesScreen } from "./NotesScreen";
import { DiscoverScreen } from "./DiscoverScreen";
import { StyleSyncScreen } from "./StyleSyncScreen";
import { CalendarScreen } from "./CalendarScreen";
import { SportsScreen } from "./SportsScreen";
import { SpaceScreen } from "./SpaceScreen";
import { IntelligenceScreen } from "./IntelligenceScreen";
import { EventsScreen } from "./EventsScreen";
import { AssistantFab } from "../components/AssistantFab";
import { AccountScreen } from "./AccountScreen";
import { CategoriesScreen } from "./CategoriesScreen";
import { ComingSoon } from "../components/ComingSoon";
import {
  StaffPanel, InventoryPanel, ReportsPanel, MarketingPanel, BusinessSettingsPanel,
  LoyaltyPanel, CompetitionPanel, PerformancePanel, SupplyPanel, PricingPanel,
} from "./BusinessExtras";

// Bu ekran FireVibe'ın gerçek src/routes/index.tsx dosyasından (Home
// bileşeni) birebir taşınmıştır — class isimleri, bölüm sırası ve kopya
// metinler kaynağa sadık kalınarak yazıldı.

type Mode = "personal" | "business";
type ViewId =
  | "flow" | "calendar" | "tasks" | "stylesync" | "discover"
  | "sports" | "events" | "space" | "notes" | "intelligence" | "personal-tools" | "account" | "categories"
  | "biz-location" | "biz-appointments" | "biz-customers" | "biz-suggestions"
  | "biz-staff" | "biz-inventory" | "biz-reports" | "biz-marketing" | "biz-settings"
  | "biz-loyalty" | "biz-competition" | "biz-performance" | "biz-supply" | "biz-pricing";

const personalNavItems: { id: ViewId; icon: React.ReactNode; label: Dict }[] = [
  { id: "flow", icon: <LayoutDashboard size={17} />, label: { tr: "Genel bakış", en: "Overview" } },
  { id: "calendar", icon: <CalendarDays size={17} />, label: { tr: "Zaman akışı", en: "Time flow" } },
  { id: "tasks", icon: <ListChecks size={17} />, label: { tr: "Yapılacaklar", en: "Tasks" } },
  { id: "stylesync", icon: <WandSparkles size={17} />, label: { tr: "StyleSync", en: "StyleSync" } },
  { id: "discover", icon: <Compass size={17} />, label: { tr: "Keşfet", en: "Discover" } },
  { id: "sports", icon: <Dumbbell size={17} />, label: { tr: "Spor akışı", en: "Sports flow" } },
  { id: "events", icon: <Users size={17} />, label: { tr: "Etkinlikler", en: "Events" } },
  { id: "space", icon: <FileText size={17} />, label: { tr: "İlgi alanlarım", en: "My interests" } },
  { id: "notes", icon: <StickyNote size={17} />, label: { tr: "Boş Alan", en: "Empty space" } },
  { id: "intelligence", icon: <Brain size={17} />, label: { tr: "Yapay zeka", en: "Intelligence" } },
  { id: "categories", icon: <Layers3 size={17} />, label: { tr: "Kategori rehberi", en: "Category guide" } },
  { id: "account", icon: <UserCog size={17} />, label: { tr: "Hesap", en: "Account" } },
];

const businessNavItems: { id: ViewId; icon: React.ReactNode; label: Dict }[] = [
  { id: "flow", icon: <LayoutDashboard size={17} />, label: { tr: "Genel bakış", en: "Overview" } },
  { id: "biz-location", icon: <MapPin size={17} />, label: { tr: "Lokasyon", en: "Location" } },
  { id: "biz-appointments", icon: <CalendarDays size={17} />, label: { tr: "Randevular", en: "Appointments" } },
  { id: "biz-customers", icon: <Users size={17} />, label: { tr: "Müşteriler", en: "Customers" } },
  { id: "biz-suggestions", icon: <Lightbulb size={17} />, label: { tr: "Öneriler", en: "Suggestions" } },
  { id: "biz-staff", icon: <Users size={17} />, label: { tr: "Personel", en: "Staff" } },
  { id: "biz-inventory", icon: <FileText size={17} />, label: { tr: "Stok & ürünler", en: "Inventory" } },
  { id: "biz-reports", icon: <Brain size={17} />, label: { tr: "Raporlar", en: "Reports" } },
  { id: "biz-marketing", icon: <Sparkles size={17} />, label: { tr: "Pazarlama", en: "Marketing" } },
  { id: "biz-settings", icon: <Settings2 size={17} />, label: { tr: "İşletme ayarları", en: "Settings" } },
  { id: "biz-loyalty", icon: <Users size={17} />, label: { tr: "Sadakat programı", en: "Loyalty" } },
  { id: "biz-competition", icon: <Compass size={17} />, label: { tr: "Rekabet analizi", en: "Competition" } },
  { id: "biz-performance", icon: <Dumbbell size={17} />, label: { tr: "Çalışan performansı", en: "Performance" } },
  { id: "biz-supply", icon: <FileText size={17} />, label: { tr: "Tedarik zinciri", en: "Supply chain" } },
  { id: "biz-pricing", icon: <Brain size={17} />, label: { tr: "Kar marjı & fiyat", en: "Pricing" } },
];

function NavItem({
  item,
  active,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  item: (typeof personalNavItems)[number];
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

export function Dashboard({ userId, email }: { userId: string; email: string }) {
  const [mode, setMode] = useState<Mode>("personal");
  const [view, setView] = useState<ViewId>("flow");
  const [dashboard, setDashboard] = useState<{ todayTasks: number; todayAppointments: number } | null>(null);
  const [personalOrder, setPersonalOrder] = useState<ViewId[]>(personalNavItems.map((n) => n.id));
  const [businessOrder, setBusinessOrder] = useState<ViewId[]>(businessNavItems.map((n) => n.id));
  const dragId = useRef<ViewId | null>(null);

  useEffect(() => {
    supabase
      .from("user_preferences")
      .select("personal_nav_order, business_nav_order")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const savedPersonal = data?.personal_nav_order as ViewId[] | undefined;
        if (Array.isArray(savedPersonal) && savedPersonal.length) {
          const known = personalNavItems.map((n) => n.id);
          setPersonalOrder([...savedPersonal.filter((id) => known.includes(id)), ...known.filter((id) => !savedPersonal.includes(id))]);
        }
        const savedBusiness = data?.business_nav_order as ViewId[] | undefined;
        if (Array.isArray(savedBusiness) && savedBusiness.length) {
          const known = businessNavItems.map((n) => n.id);
          setBusinessOrder([...savedBusiness.filter((id) => known.includes(id)), ...known.filter((id) => !savedBusiness.includes(id))]);
        }
      });
  }, [userId]);

  const currentNavItems = mode === "personal" ? personalNavItems : businessNavItems;
  const currentOrder = mode === "personal" ? personalOrder : businessOrder;

  async function persistOrder(next: ViewId[]) {
    if (mode === "personal") setPersonalOrder(next);
    else setBusinessOrder(next);
    const column = mode === "personal" ? "personal_nav_order" : "business_nav_order";
    await supabase.from("user_preferences").upsert({ user_id: userId, [column]: next, updated_at: new Date().toISOString() });
  }

  function handleDrop(targetId: ViewId) {
    if (!dragId.current || dragId.current === targetId) return;
    const from = currentOrder.indexOf(dragId.current);
    const to = currentOrder.indexOf(targetId);
    const next = [...currentOrder];
    next.splice(from, 1);
    next.splice(to, 0, dragId.current);
    persistOrder(next);
    dragId.current = null;
  }

  const orderedNavItems = currentOrder
    .map((id) => currentNavItems.find((n) => n.id === id))
    .filter(Boolean) as typeof currentNavItems;

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
            <h1>{tt(currentNavItems.find((n) => n.id === view)?.label ?? { tr: "Genel bakış", en: "Overview" })}</h1>
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
        {view === "stylesync" && <PanelWrap><StyleSyncScreen userId={userId} /></PanelWrap>}
        {view === "calendar" && <PanelWrap><CalendarScreen userId={userId} /></PanelWrap>}
        {view === "sports" && <PanelWrap><SportsScreen /></PanelWrap>}
        {view === "space" && <PanelWrap><SpaceScreen userId={userId} /></PanelWrap>}
        {view === "intelligence" && <PanelWrap><IntelligenceScreen /></PanelWrap>}
        {view === "events" && <PanelWrap><EventsScreen userId={userId} /></PanelWrap>}
        {view === "account" && <PanelWrap><AccountScreen email={email} /></PanelWrap>}
        {view === "categories" && <PanelWrap><CategoriesScreen /></PanelWrap>}
        {view === "biz-location" && <PanelWrap><BusinessLocationPanel userId={userId} /></PanelWrap>}
        {view === "biz-appointments" && <PanelWrap><BusinessAppointmentsPanel userId={userId} /></PanelWrap>}
        {view === "biz-customers" && <PanelWrap><BusinessCustomersPanel userId={userId} /></PanelWrap>}
        {view === "biz-suggestions" && <PanelWrap><BusinessSuggestionsPanel /></PanelWrap>}
        {view === "biz-staff" && <PanelWrap><StaffPanel /></PanelWrap>}
        {view === "biz-inventory" && <PanelWrap><InventoryPanel /></PanelWrap>}
        {view === "biz-reports" && <PanelWrap><ReportsPanel /></PanelWrap>}
        {view === "biz-marketing" && <PanelWrap><MarketingPanel /></PanelWrap>}
        {view === "biz-settings" && <PanelWrap><BusinessSettingsPanel /></PanelWrap>}
        {view === "biz-loyalty" && <PanelWrap><LoyaltyPanel /></PanelWrap>}
        {view === "biz-competition" && <PanelWrap><CompetitionPanel /></PanelWrap>}
        {view === "biz-performance" && <PanelWrap><PerformancePanel /></PanelWrap>}
        {view === "biz-supply" && <PanelWrap><SupplyPanel /></PanelWrap>}
        {view === "biz-pricing" && <PanelWrap><PricingPanel /></PanelWrap>}
        {![
          "flow", "tasks", "notes", "discover", "stylesync",
          "calendar", "sports", "space", "intelligence", "events", "account", "categories",
          "biz-location", "biz-appointments", "biz-customers", "biz-suggestions",
          "biz-staff", "biz-inventory", "biz-reports", "biz-marketing", "biz-settings",
          "biz-loyalty", "biz-competition", "biz-performance", "biz-supply", "biz-pricing",
        ].includes(view) && (
          <PanelWrap>
            <ComingSoon label={tt(currentNavItems.find((n) => n.id === view)?.label ?? { tr: "", en: "" })} />
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
      <AssistantFab isBusiness={mode === "business"} go={(id) => setView(id as ViewId)} />
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

      <div className="fire-score-band">
        <span className="fire-score-mark">
          <Flame size={22} />
        </span>
        <div>
          <h2>
            {dashboard ? Math.max(0, 100 - dashboard.todayTasks * 5) : "—"} <span>/ 100</span>
          </h2>
          <p>{tt({ tr: "Bugünkü akış puanın", en: "Your flow score today" })}</p>
        </div>
        <div className="fire-progress">
          <span style={{ width: dashboard ? `${Math.max(0, 100 - dashboard.todayTasks * 5)}%` : "0%" }} />
        </div>
        <button className="fire-challenge" onClick={() => go("tasks")}>
          {tt({ tr: "Görevleri gör", en: "View tasks" })}
        </button>
      </div>

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

// ============================================================
// İşletme — öncelik sırasıyla: Lokasyon → Takvim → CRM → Öneriler
// ============================================================

type Business = { id: string; name: string; industry: string; city: string; address: string | null; phone: string | null; slug: string };

function slugify(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function BusinessLocationPanel({ userId }: { userId: string }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    const { data } = await supabase.from("businesses").select("*").eq("owner_id", userId).maybeSingle();
    if (data) {
      setBusiness(data);
      setName(data.name);
      setIndustry(data.industry);
      setCity(data.city);
      setAddress(data.address ?? "");
      setPhone(data.phone ?? "");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !industry.trim() || !city.trim()) return;
    setBusy(true);
    setSaved(false);
    const payload = { name, industry, city, address: address || null, phone: phone || null, owner_id: userId, slug: slugify(name) };
    if (business) {
      await supabase.from("businesses").update(payload).eq("id", business.id);
    } else {
      const { data } = await supabase.from("businesses").insert(payload).select().single();
      if (data) {
        // İlk kurulumda randevu alabilmek için varsayılan bir personel ve
        // hizmet oluşturulur — kullanıcı Takvim'e gider gitmez randevu
        // ekleyebilsin diye (aksi halde professional_id/service_id boş kalır).
        const { data: pro } = await supabase.from("professionals").insert({ business_id: data.id, name: "Genel", role: "Personel" }).select().single();
        if (pro) {
          await supabase.from("services").insert({ business_id: data.id, name: "Randevu", duration_minutes: 30, price: 0 });
        }
      }
    }
    setBusy(false);
    setSaved(true);
    load();
  }

  return (
    <section className="panel">
      <PanelHeading eyebrow={tt({ tr: "İşletme", en: "Business" })} title={tt({ tr: "Lokasyon ve işletme profili", en: "Location & business profile" })} />
      <form onSubmit={save} className="wardrobe-form" style={{ maxWidth: 420 }}>
        <label>
          {tt({ tr: "İşletme adı", en: "Business name" })}
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          {tt({ tr: "Sektör", en: "Industry" })}
          <input required value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder={tt({ tr: "Örn. kuaför, masaj salonu", en: "e.g. hair salon, massage studio" })} />
        </label>
        <label>
          {tt({ tr: "Şehir", en: "City" })}
          <input required value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label>
          {tt({ tr: "Adres", en: "Address" })}
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label>
          {tt({ tr: "Telefon", en: "Phone" })}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <button className="primary-button" disabled={busy}>
          {busy ? tt({ tr: "Kaydediliyor…", en: "Saving…" }) : tt({ tr: "Kaydet", en: "Save" })}
        </button>
        {saved && <p className="suggestion">{tt({ tr: "Kaydedildi.", en: "Saved." })}</p>}
      </form>
    </section>
  );
}

function BusinessAppointmentsPanel({ userId }: { userId: string }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data: biz } = await supabase.from("businesses").select("id, slug").eq("owner_id", userId).maybeSingle();
    if (!biz) return;
    setBusinessId(biz.id);
    setBusinessSlug(biz.slug);
    const { data: pros } = await supabase.from("professionals").select("id").eq("business_id", biz.id).limit(1);
    const { data: svcs } = await supabase.from("services").select("id, duration_minutes").eq("business_id", biz.id).limit(1);
    setProfessionalId(pros?.[0]?.id ?? null);
    setServiceId(svcs?.[0]?.id ?? null);
    const { data: appts } = await supabase.from("appointments").select("*").eq("business_id", biz.id).order("starts_at", { ascending: true });
    setAppointments(appts ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!businessId || !professionalId || !serviceId) {
      setError(tt({ tr: "Önce Lokasyon sekmesinden işletmeni kaydet.", en: "Set up your business in Location first." }));
      return;
    }
    if (!customerName.trim() || !customerEmail.trim() || !startsAt) return;
    const starts = new Date(startsAt);
    const ends = new Date(starts.getTime() + 30 * 60000);
    const { error } = await supabase.from("appointments").insert({
      business_id: businessId,
      professional_id: professionalId,
      service_id: serviceId,
      customer_name: customerName,
      customer_email: customerEmail,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
    });
    if (error) {
      setError(error.message.includes("no_overlapping") ? tt({ tr: "Bu saatte zaten bir randevu var.", en: "There's already an appointment at that time." }) : error.message);
      return;
    }
    setCustomerName("");
    setCustomerEmail("");
    setStartsAt("");
    load();
  }

  return (
    <section className="panel">
      <PanelHeading eyebrow={tt({ tr: "İşletme", en: "Business" })} title={tt({ tr: "Randevu takvimi", en: "Appointment calendar" })} />
      {businessSlug && (
        <p className="suggestion" style={{ marginBottom: 14 }}>
          {tt({ tr: "Herkese açık rezervasyon linkin: ", en: "Your public booking link: " })}
          <a href={`${window.location.origin}/book/${businessSlug}`} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
            {window.location.origin}/book/{businessSlug}
          </a>
        </p>
      )}
      <form onSubmit={add} className="wardrobe-form" style={{ maxWidth: 420 }}>
        <label>
          {tt({ tr: "Müşteri adı", en: "Customer name" })}
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </label>
        <label>
          {tt({ tr: "Müşteri e-postası", en: "Customer email" })}
          <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
        </label>
        <label>
          {tt({ tr: "Tarih ve saat", en: "Date & time" })}
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </label>
        <button className="primary-button"><Plus size={16} /> {tt({ tr: "Randevu ekle", en: "Add appointment" })}</button>
        {error && <p className="suggestion" role="alert">{error}</p>}
      </form>

      <div style={{ marginTop: 20 }}>
        {appointments.length === 0 && <p className="empty-schedule">{tt({ tr: "Henüz randevu yok.", en: "No appointments yet." })}</p>}
        {appointments.map((a) => (
          <div key={a.id} className="appointment-row">
            <strong>{a.customer_name}</strong>
            <span>{new Date(a.starts_at).toLocaleString("tr-TR")}</span>
            <small>{a.status}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function BusinessCustomersPanel({ userId }: { userId: string }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function load() {
    const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", userId).maybeSingle();
    if (!biz) return;
    setBusinessId(biz.id);
    const { data } = await supabase.from("customers").select("*").eq("business_id", biz.id).order("created_at", { ascending: false });
    setCustomers(data ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId || !name.trim()) return;
    await supabase.from("customers").insert({ business_id: businessId, name, email: email || null, phone: phone || null });
    setName("");
    setEmail("");
    setPhone("");
    load();
  }

  return (
    <section className="panel">
      <PanelHeading eyebrow={tt({ tr: "İşletme", en: "Business" })} title={tt({ tr: "Müşteriler (CRM)", en: "Customers (CRM)" })} />
      {!businessId && <p className="suggestion">{tt({ tr: "Önce Lokasyon sekmesinden işletmeni kaydet.", en: "Set up your business in Location first." })}</p>}
      <form onSubmit={add} className="wardrobe-form" style={{ maxWidth: 420 }}>
        <label>
          {tt({ tr: "Ad", en: "Name" })}
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          {tt({ tr: "E-posta", en: "Email" })}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          {tt({ tr: "Telefon", en: "Phone" })}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <button className="primary-button"><Plus size={16} /> {tt({ tr: "Müşteri ekle", en: "Add customer" })}</button>
      </form>
      <div style={{ marginTop: 20 }}>
        {customers.length === 0 && <p className="empty-schedule">{tt({ tr: "Henüz müşteri yok.", en: "No customers yet." })}</p>}
        {customers.map((c) => (
          <div key={c.id} className="appointment-row">
            <strong>{c.name}</strong>
            <span>{c.email}</span>
            <small>{c.phone}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function BusinessSuggestionsPanel() {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "missing-key" | "error">("idle");
  const [text, setText] = useState("");

  async function ask() {
    setState("loading");
    const result = await askAi(
      "Sen Planmoy'un işletme danışmanı yapay zekasısın. Türkçe yaz, en fazla 3 cümle. Randevu yoğunluğu, müşteri sadakati ve genel işletme performansı hakkında uygulanabilir tek bir öneri ver.",
      "İşletme henüz yeni kuruldu, randevu ve müşteri verisi sınırlı olabilir."
    );
    if (!result.ok) {
      setState(result.reason === "missing-key" ? "missing-key" : "error");
      return;
    }
    setText(result.suggestion);
    setState("ready");
  }

  return (
    <section className="panel business-ai">
      <PanelHeading eyebrow={tt({ tr: "İşletme", en: "Business" })} title={tt({ tr: "Yapay zeka önerileri", en: "AI suggestions" })} />
      <button className="primary-button" onClick={ask} disabled={state === "loading"}>
        <Sparkles size={16} /> {state === "loading" ? tt({ tr: "Düşünüyor…", en: "Thinking…" }) : tt({ tr: "Öneri al", en: "Get a suggestion" })}
      </button>
      {state === "missing-key" && <p className="suggestion">{tt({ tr: "AI sağlayıcısı (Gemini) henüz yapılandırılmadı.", en: "AI provider (Gemini) isn't configured yet." })}</p>}
      {state === "error" && <p className="suggestion">{tt({ tr: "Öneri alınamadı.", en: "Couldn't get a suggestion." })}</p>}
      {state === "ready" && <p className="suggestion">{text}</p>}
    </section>
  );
}
