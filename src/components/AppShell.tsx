import { Flame, LogOut, type LucideIcon } from "lucide-react";
import { tt, type Dict } from "../lib/i18n";

export type NavItem = { id: string; label: Dict; icon: LucideIcon };

export function AppShell({
  navItems,
  activeId,
  onSelect,
  title,
  eyebrow,
  onSignOut,
  modeSwitcher,
  children,
}: {
  navItems: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  title: string;
  eyebrow: string;
  onSignOut: () => void;
  modeSwitcher: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-screen">
      <div className="starfield" aria-hidden="true" />

      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-black/20 px-4 py-6 sm:flex">
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#38a9d4] to-[#756fe2]">
            <Flame size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold tracking-tight">Planmoy</span>
        </div>

        <div className="mt-6">{modeSwitcher}</div>

        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Ana menü">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  active
                    ? "bg-[var(--color-cyan-400)]/15 text-[var(--color-cyan-300)]"
                    : "text-[var(--color-mist-300)] hover:bg-white/5 hover:text-[var(--color-mist-100)]"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                {tt(item.label)}
              </button>
            );
          })}
        </nav>

        <button
          onClick={onSignOut}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-[var(--color-mist-500)] hover:bg-white/5 hover:text-[var(--color-mist-100)]"
        >
          <LogOut size={16} />
          {tt({ tr: "Çıkış yap", en: "Sign out" })}
        </button>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between sm:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#38a9d4] to-[#756fe2]">
              <Flame size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-semibold tracking-tight">Planmoy</span>
          </div>
          <button onClick={onSignOut} className="text-[var(--color-mist-300)]">
            <LogOut size={18} />
          </button>
        </header>
        <div className="mt-4 sm:mt-0">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-cyan-300)]">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        </div>

        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
