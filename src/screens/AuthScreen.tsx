import { useState, type FormEvent } from "react";
import { Flame, Loader2, Phone, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt, type Dict } from "../lib/i18n";

type Method = "choose" | "email" | "phone" | "phone-otp";

const copy = {
  title: { tr: "Hesabını oluştur", en: "Create your account" } satisfies Dict,
  titleIn: { tr: "Tekrar hoş geldin", en: "Welcome back" } satisfies Dict,
  sub: {
    tr: "Randevuların, müşterilerin ve görevlerin hesabına bağlı olarak saklanır.",
    en: "Your appointments, customers, and tasks are stored against your account.",
  } satisfies Dict,
  phoneBtn: { tr: "Telefon ile giriş", en: "Continue with phone" } satisfies Dict,
  googleBtn: { tr: "Google ile giriş", en: "Continue with Google" } satisfies Dict,
  emailBtn: { tr: "E-posta ile devam et", en: "Continue with email" } satisfies Dict,
  demoBtn: { tr: "Hesabım yok, demo ile dene", en: "No account — try the demo" } satisfies Dict,
  or: { tr: "veya", en: "or" } satisfies Dict,
  email: { tr: "E-posta", en: "Email" } satisfies Dict,
  password: { tr: "Şifre", en: "Password" } satisfies Dict,
  phone: { tr: "Telefon numarası", en: "Phone number" } satisfies Dict,
  otp: { tr: "SMS ile gelen kod", en: "Code from SMS" } satisfies Dict,
  sendCode: { tr: "Kod gönder", en: "Send code" } satisfies Dict,
  verify: { tr: "Doğrula", en: "Verify" } satisfies Dict,
  submitUp: { tr: "Hesap oluştur", en: "Create account" } satisfies Dict,
  submitIn: { tr: "Giriş yap", en: "Sign in" } satisfies Dict,
  switchToIn: { tr: "Zaten hesabım var", en: "I already have an account" } satisfies Dict,
  switchToUp: { tr: "Hesabım yok, oluşturmak istiyorum", en: "I don't have an account yet" } satisfies Dict,
  back: { tr: "Geri", en: "Back" } satisfies Dict,
};

export function AuthScreen() {
  const [screen, setScreen] = useState<Method>("choose");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSubmit(e: FormEvent) {
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

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) setError(error.message);
    else setScreen("phone-otp");
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setBusy(false);
    if (error) setError(error.message);
  }

  async function handleGoogle() {
    setError(null);
    // NOT: Android'de gerçek geri dönüş için Capacitor deep-link (App eklentisi +
    // intent-filter) ayrıca kurulmalı — şu an web akışı çalışır, native geri dönüş
    // Faz 4'te tamamlanacak.
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) setError(error.message);
  }

  async function handleDemo() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInAnonymously();
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

        {error && (
          <p className="mt-4 text-sm text-[#ff8a80]" role="alert">
            {error}
          </p>
        )}

        {screen === "choose" && (
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={() => setScreen("phone")}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium hover:bg-white/10"
            >
              <Phone size={16} /> {tt(copy.phoneBtn)}
            </button>
            <button
              onClick={handleGoogle}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium hover:bg-white/10"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.1 4 9.3 8.5 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.4 0 10.3-1.9 14.1-5.2l-6.5-5.4C29.5 35.4 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.1 39.6 16 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.5 5.4C41.5 35.9 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"/>
              </svg>
              {tt(copy.googleBtn)}
            </button>
            <button
              onClick={() => setScreen("email")}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium hover:bg-white/10"
            >
              <Mail size={16} /> {tt(copy.emailBtn)}
            </button>

            <div className="my-1 flex items-center gap-3 text-xs text-[var(--color-mist-500)]">
              <span className="h-px flex-1 bg-white/10" />
              {tt(copy.or)}
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              onClick={handleDemo}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#38a9d4] to-[#756fe2] py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {tt(copy.demoBtn)}
            </button>
          </div>
        )}

        {screen === "email" && (
          <form onSubmit={handleEmailSubmit} className="mt-6 flex flex-col gap-3">
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[var(--color-cyan-400)]"
              />
              <span className="text-xs text-[var(--color-mist-500)]">
                {tt({ tr: "En az 8 karakter", en: "At least 8 characters" })}
              </span>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#38a9d4] to-[#756fe2] py-2.5 font-medium text-white disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {mode === "up" ? tt(copy.submitUp) : tt(copy.submitIn)}
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
              className="text-sm text-[var(--color-cyan-300)] hover:underline"
            >
              {mode === "up" ? tt(copy.switchToIn) : tt(copy.switchToUp)}
            </button>
            <button
              type="button"
              onClick={() => setScreen("choose")}
              className="text-sm text-[var(--color-mist-500)] hover:underline"
            >
              ← {tt(copy.back)}
            </button>
          </form>
        )}

        {screen === "phone" && (
          <form onSubmit={handleSendOtp} className="mt-6 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-[var(--color-mist-300)]">{tt(copy.phone)}</span>
              <input
                type="tel"
                required
                placeholder="+90 5xx xxx xx xx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[var(--color-cyan-400)]"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#38a9d4] to-[#756fe2] py-2.5 font-medium text-white disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {tt(copy.sendCode)}
            </button>
            <button
              type="button"
              onClick={() => setScreen("choose")}
              className="text-sm text-[var(--color-mist-500)] hover:underline"
            >
              ← {tt(copy.back)}
            </button>
          </form>
        )}

        {screen === "phone-otp" && (
          <form onSubmit={handleVerifyOtp} className="mt-6 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-[var(--color-mist-300)]">{tt(copy.otp)}</span>
              <input
                type="text"
                required
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[var(--color-cyan-400)]"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#38a9d4] to-[#756fe2] py-2.5 font-medium text-white disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {tt(copy.verify)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
