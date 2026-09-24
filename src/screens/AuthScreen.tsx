import { useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, Check, Mail, Phone, ShieldCheck, Sparkles, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt, type Dict } from "../lib/i18n";

// Bu ekran FireVibe'ın gerçek src/routes/auth.tsx dosyasındaki class'ları
// ve kopya metinleri kullanır. Kullanıcının açık isteğiyle 4 eşit giriş
// yöntemi (Google / E-posta / Demo / Telefon) tek bir seçim ekranında
// gösteriliyor — Demo, gerçek FireVibe'da olmayan, test kolaylığı için
// eklenmiş bir istisna.

type Screen = "choose" | "email" | "phone";

const copy = {
  eyebrow: { tr: "Güvenli çalışma alanı", en: "Secure workspace" } satisfies Dict,
  signIn: { tr: "Akışına giriş yap.", en: "Sign in to your flow." } satisfies Dict,
  signUp: { tr: "Hesabını oluştur.", en: "Create your account." } satisfies Dict,
  chooseTitle: { tr: "Nasıl devam etmek istersin?", en: "How would you like to continue?" } satisfies Dict,
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
  google: { tr: "Google ile giriş", en: "Continue with Google" } satisfies Dict,
  emailBtn: { tr: "E-posta ile giriş", en: "Continue with email" } satisfies Dict,
  demoBtn: { tr: "Demo olarak giriş yap", en: "Sign in with demo" } satisfies Dict,
  phone: { tr: "Telefon ile giriş", en: "Continue with phone" } satisfies Dict,
  soon: { tr: "Yakında", en: "Soon" } satisfies Dict,
  back: { tr: "Geri", en: "Back" } satisfies Dict,
};

function ChooseTile({
  icon,
  label,
  status,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  status?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="auth-choice-tile" onClick={onClick} disabled={!!status}>
      <span className="auth-choice-icon">{icon}</span>
      <span className="auth-choice-label">{label}</span>
      {status && <span className="provider-status">{status}</span>}
      {!status && <ArrowRight size={14} className="auth-choice-arrow" />}
    </button>
  );
}

export function AuthScreen({ onOpenLegal }: { onOpenLegal: () => void }) {
  const [screen, setScreen] = useState<Screen>("choose");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

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

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    setBusy(false);
    if (error) setError(error.message);
  }

  async function sendPhoneOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) setError(error.message);
    else setOtpSent(true);
  }

  async function verifyPhoneOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
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
          <h1>{screen === "choose" ? tt(copy.chooseTitle) : mode === "signin" ? tt(copy.signIn) : tt(copy.signUp)}</h1>
          <p className="auth-lead">{tt(copy.lead)}</p>

          {screen === "choose" && (
            <div className="auth-choice-grid">
              <ChooseTile icon={<span className="google-mark">G</span>} label={tt(copy.google)} onClick={signInWithGoogle} />
              <ChooseTile icon={<Mail size={17} />} label={tt(copy.emailBtn)} onClick={() => setScreen("email")} />
              <ChooseTile icon={<Sparkles size={17} />} label={tt(copy.demoBtn)} onClick={tryDemo} />
              <ChooseTile icon={<Phone size={17} />} label={tt(copy.phone)} onClick={() => setScreen("phone")} />
            </div>
          )}

          {screen === "email" && (
            <>
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
                  <label className="auth-consent">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    <span className="auth-consent-box">
                      <Check size={11} />
                    </span>
                    <span className="auth-consent-text">
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

              <button type="button" className="auth-toggle" style={{ opacity: 0.6 }} onClick={() => setScreen("choose")}>
                ← {tt(copy.back)}
              </button>
            </>
          )}

          {screen === "phone" && (
            <>
              {!otpSent ? (
                <form onSubmit={sendPhoneOtp}>
                  <label>
                    {tt({ tr: "Telefon numarası", en: "Phone number" })}
                    <input required type="tel" autoComplete="tel" placeholder="+90 5xx xxx xx xx" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </label>
                  {error && (
                    <div className="form-error" role="alert">
                      <p>{error}</p>
                    </div>
                  )}
                  <button disabled={busy} className="auth-submit">
                    {busy ? tt(copy.wait) : tt({ tr: "Kod gönder", en: "Send code" })}
                    <ArrowRight size={16} />
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyPhoneOtp}>
                  <label>
                    {tt({ tr: "SMS ile gelen kod", en: "Code from SMS" })}
                    <input required autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} />
                  </label>
                  {error && (
                    <div className="form-error" role="alert">
                      <p>{error}</p>
                    </div>
                  )}
                  <button disabled={busy} className="auth-submit">
                    {busy ? tt(copy.wait) : tt({ tr: "Doğrula", en: "Verify" })}
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}
              <button type="button" className="auth-toggle" style={{ opacity: 0.6 }} onClick={() => { setScreen("choose"); setOtpSent(false); setError(null); }}>
                ← {tt(copy.back)}
              </button>
            </>
          )}

          <p className="auth-legal">
            {tt(copy.legal)} <a href="/privacy" onClick={(e) => { e.preventDefault(); onOpenLegal(); }} style={{ cursor: "pointer" }}>{tt(copy.privacy)}</a>
          </p>
          <p className="auth-security">
            <ShieldCheck size={14} /> {tt(copy.privacy)}
          </p>
        </section>
      </div>
    </main>
  );
}
