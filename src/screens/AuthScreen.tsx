import { useState, type FormEvent } from "react";
import { Flame, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt, type Dict } from "../lib/i18n";

const copy = {
  title: { tr: "Hesabını oluştur", en: "Create your account" } satisfies Dict,
  titleIn: { tr: "Tekrar hoş geldin", en: "Welcome back" } satisfies Dict,
  sub: {
    tr: "Randevuların, müşterilerin ve görevlerin hesabına bağlı olarak saklanır.",
    en: "Your appointments, customers, and tasks are stored against your account.",
  } satisfies Dict,
  email: { tr: "E-posta", en: "Email" } satisfies Dict,
  password: { tr: "Şifre", en: "Password" } satisfies Dict,
  submitUp: { tr: "Hesap oluştur", en: "Create account" } satisfies Dict,
  submitIn: { tr: "Giriş yap", en: "Sign in" } satisfies Dict,
  switchToIn: { tr: "Zaten hesabım var", en: "I already have an account" } satisfies Dict,
  switchToUp: { tr: "Hesabım yok, oluşturmak istiyorum", en: "I don't have an account yet" } satisfies Dict,
};

export function AuthScreen() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } =
      mode === "up"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#38a9d4] to-[#756fe2]">
          <Flame size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-semibold tracking-tight">Planmoy</span>
      </div>

      <div className="orbit-card rise-in p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "up" ? tt(copy.title) : tt(copy.titleIn)}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-mist-300)]">{tt(copy.sub)}</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-mist-300)]">{tt(copy.email)}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[var(--color-cyan-400)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-mist-300)]">{tt(copy.password)}</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[var(--color-cyan-400)]"
            />
          </label>

          {error && (
            <p className="text-sm text-[#ff8a80]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#38a9d4] to-[#756fe2] py-2.5 font-medium text-white transition-opacity disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === "up" ? tt(copy.submitUp) : tt(copy.submitIn)}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "up" ? "in" : "up")}
          className="mt-4 text-sm text-[var(--color-cyan-300)] hover:underline"
        >
          {mode === "up" ? tt(copy.switchToIn) : tt(copy.switchToUp)}
        </button>
      </div>
    </div>
  );
}
