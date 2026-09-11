import { useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, Check, Phone, ShieldCheck, Sparkles, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt, type Dict } from "../lib/i18n";

// Bu ekran FireVibe'ın gerçek src/routes/auth.tsx dosyasından birebir
// taşınmıştır (yapı, class isimleri, kopya metinler). Telefon ve Google
// girişi FireVibe'da da devre dışıydı ("Yakında") — burada da öyle.
// İSTİSNA: "Demo ile dene" butonu gerçek FireVibe'da yok, kullanıcının
// açık isteğiyle test kolaylığı için eklendi (anonim Supabase girişi).

const copy = {
  eyebrow: { tr: "Güvenli çalışma alanı", en: "Secure workspace" } satisfies Dict,
  signIn: { tr: "Akışına giriş yap.", en: "Sign in to your flow." } satisfies Dict,
  signUp: { tr: "Hesabını oluştur.", en: "Create your account." } satisfies Dict,
  lead: {
    tr: "Randevuların, müşterilerin ve görevlerin hesabına bağlı olarak saklanır.",
    en: "Your appointments, clients and tasks stay connected to your account.",
  } satisfies Dict,
  email: { tr: "E-posta", en: "Email" } satisfies Dict,
  password: { tr: "Şifre", en: "Password" } satisfies Dict,
  submitIn: { tr: "Giriş yap", en: "Sign in" } satisfies Dict,
  submitUp: { tr: "Hesap oluştur", en: "Create account" } satisfies Dict,
  wait: { tr: "Bekleyin…", en: "Please wait…" } satisfies Dict,
  toggleIn: { tr: "Yeni hesap oluştur", en: "Create a new account" } satisfies Dict,
  toggleUp: { tr: "Zaten hesabım var", en: "I already have an account" } satisfies Dict,
  legal: { tr: "Devam ederek", en: "By continuing, you agree to the" } satisfies Dict,
  privacy: { tr: "Gizlilik ve Çerezler", en: "Privacy & Cookies" } satisfies Dict,
  point1: { tr: "Randevu ve görevlerini tek bakışta gör", en: "See appointments and tasks at a glance" } satisfies Dict,
  point2: { tr: "Kişisel verilerin üzerinde kontrol sende", en: "You control your personal data" } satisfies Dict,
  point3: { tr: "Ödeme almadan, açık ve güvenli rezervasyon", en: "Clear, payment-free booking" } satisfies Dict,
  personalHead: { tr: "Kişisel alanını", en: "Your personal space and" } satisfies Dict,
  businessHead: { tr: "işletmeni birlikte yönet.", en: "your business, together." } satisfies Dict,
  phoneSoon: { tr: "Telefon ile giriş", en: "Continue with phone" } satisfies Dict,
  googleSoon: { tr: "Google ile giriş", en: "Continue with Google" } satisfies Dict,
  soon: { tr: "Yakında", en: "Soon" } satisfies Dict,
  providerNote: {
    tr: "Telefon ve Google girişi henüz etkin değil. Şimdilik güvenli e-posta girişi kullanılabilir.",
    en: "Phone and Google sign-in aren't active yet. Secure email sign-in is available for now.",
  } satisfies Dict,
  orEmail: { tr: "E-posta ile devam et", en: "Continue with email" } satisfies Dict,
};

export function AuthScreen({ onOpenLegal }: { onOpenLegal: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !consent) {
      setError(tt({ tr: "Devam etmek için Kullanım Koşulları ve Gizlilik Politikasını kabul etmelisin.", en: "You must accept the Terms and Privacy Policy to continue." }));
      return;
    }
    setBusy(true);
    setError(null);
    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
  }

  async function tryDemo() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <main className="space-auth auth-page">
      <div className="auth-layout">
        <section className="auth-intro">
          <a href="/" className="auth-brand" onClick={(e) => e.preventDefault()}>
            plan<span>moy</span>
            <i />
          </a>

          {/* Tanıtım videosu — şimdilik buton olarak duruyor, video dosyası
              eklendiğinde bağlanacak. */}
          <button type="button" className="intro-video" onClick={() => {}} aria-label={tt({ tr: "Tanıtım videosunu oynat", en: "Play intro video" })} style={{ border: 0, padding: 0, cursor: "pointer" }}>
            <div className="video-orbit">
              <span />
              <b>PLANMOY</b>
            </div>
            <span className="video-play">
              <Sparkles size={16} />
            </span>
            <small>{tt({ tr: "60 saniyede keşfet", en: "Discover in 60s" })}</small>
          </button>

          <h2 className="auth-primary-message">
            <span>{tt(copy.personalHead)}</span>
            <strong>{tt(copy.businessHead)}</strong>
          </h2>
          <div className="auth-feature-list">
            <div>
              <span className="auth-feature-icon cyan">
                <CalendarDays size={22} />
                <Check size={11} />
              </span>
              <b>{tt(copy.point1)}</b>
            </div>
            <div>
              <span className="auth-feature-icon violet">
                <Users size={22} />
                <Check size={11} />
              </span>
              <b>{tt(copy.point2)}</b>
            </div>
            <div>
              <span className="auth-feature-icon mint">
                <Sparkles size={22} />
                <Check size={11} />
              </span>
              <b>{tt(copy.point3)}</b>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <p className="eyebrow">{tt(copy.eyebrow)}</p>
          <h1>{mode === "signin" ? tt(copy.signIn) : tt(copy.signUp)}</h1>
          <p className="auth-lead">{tt(copy.lead)}</p>

          <div className="auth-provider-grid" aria-label="Alternatif giriş seçenekleri">
            <button type="button" disabled title="Google ile giriş yakında">
              <span className="google-mark">G</span> {tt(copy.googleSoon)} <span className="provider-status">{tt(copy.soon)}</span>
            </button>
          </div>
          <p className="auth-provider-note">{tt(copy.providerNote)}</p>

          <div className="auth-or">
            <span>{tt(copy.orEmail)}</span>
          </div>

          <form onSubmit={submit}>
            <label>
              {tt(copy.email)}
              <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              {tt(copy.password)}
              <input
                required
                minLength={8}
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {mode === "signup" && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, fontWeight: 400 }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
                <span>
                  {tt({ tr: "Kullanım Koşulları ve Gizlilik Politikasını okudum, kabul ediyorum.", en: "I have read and accept the Terms of Use and Privacy Policy." })}
                </span>
              </label>
            )}
            {error && (
              <div className="form-error" role="alert">
                <p>{error}</p>
              </div>
            )}
            <button disabled={busy} className="auth-submit">
              {busy ? tt(copy.wait) : mode === "signin" ? tt(copy.submitIn) : tt(copy.submitUp)}
              <ArrowRight size={16} />
            </button>
          </form>

          <button
            className="auth-toggle"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
          >
            {mode === "signin" ? tt(copy.toggleIn) : tt(copy.toggleUp)}
          </button>

          {/* Test kolaylığı için eklendi — gerçek FireVibe'da bu buton yok,
              kullanıcının açık isteğiyle geri eklendi. */}
          <button
            type="button"
            onClick={tryDemo}
            disabled={busy}
            className="secondary-button"
            style={{ width: "100%", marginTop: 10 }}
          >
            {tt({ tr: "Hesabım yok, demo ile dene", en: "No account — try the demo" })}
          </button>

          <p className="auth-legal">
            {tt(copy.legal)} <a onClick={onOpenLegal} style={{ cursor: "pointer" }}>{tt(copy.privacy)}</a>
          </p>
          <p className="auth-security">
            <ShieldCheck size={14} /> {tt(copy.privacy)}
          </p>

          <p style={{ marginTop: 14, textAlign: "center", fontSize: 10.5, opacity: 0.55, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Phone size={11} /> {tt(copy.phoneSoon)} <span style={{ opacity: 0.8 }}>· {tt(copy.soon)}</span>
          </p>
        </section>
      </div>
    </main>
  );
}
