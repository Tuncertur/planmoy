import { ArrowLeft, FileText, Lock, ShieldCheck } from "lucide-react";
import { tt } from "../lib/i18n";

// TASLAK içerik — gerçek yayın öncesi bir avukat tarafından gözden
// geçirilmeli. KVKK (Türkiye) ve GDPR (AB) gibi ülkeye özel yükümlülükler
// burada genel hatlarıyla ele alınmıştır, hukuki tavsiye yerine geçmez.

export function LegalScreen({ onBack }: { onBack: () => void }) {
  return (
    <main className="legal-page">
      <header>
        <a className="legal-back" onClick={onBack} style={{ cursor: "pointer" }}>
          <ArrowLeft size={14} /> {tt({ tr: "Geri", en: "Back" })}
        </a>
      </header>
      <div className="legal-wrap">
        <h1>{tt({ tr: "Gizlilik ve Kullanım Koşulları", en: "Privacy & Terms of Use" })}</h1>
        <p className="legal-lead">
          {tt({
            tr: "Bu sayfa taslak niteliğindedir. Yayına almadan önce mutlaka bir hukuk danışmanıyla gözden geçirilmelidir — bu metin hukuki tavsiye değildir.",
            en: "This page is a draft. It must be reviewed by legal counsel before publishing — this text is not legal advice.",
          })}
        </p>

        <section className="legal-section">
          <Lock size={20} />
          <div>
            <h2>{tt({ tr: "Hangi verileri topluyoruz", en: "What data we collect" })}</h2>
            <p>
              {tt({
                tr: "Hesabınla ilişkili e-posta, görevler, notlar, randevu ve işletme kayıtların Supabase üzerinde saklanır. Hiçbir veri açık rızan olmadan üçüncü taraflarla paylaşılmaz.",
                en: "Your email, tasks, notes, appointments, and business records are stored via Supabase. No data is shared with third parties without your explicit consent.",
              })}
            </p>
          </div>
        </section>

        <section className="legal-section">
          <ShieldCheck size={20} />
          <div>
            <h2>{tt({ tr: "Haklarınız (KVKK / GDPR)", en: "Your rights (KVKK / GDPR)" })}</h2>
            <p>
              {tt({
                tr: "Verilerine erişme, düzeltme, silme ve taşınabilirlik talep etme hakkına sahipsin. Hesap silme talebi için destek@planmoy.app adresine yazabilirsin.",
                en: "You have the right to access, correct, delete, and request portability of your data. Contact support@planmoy.app to request account deletion.",
              })}
            </p>
          </div>
        </section>

        <section className="legal-section">
          <FileText size={20} />
          <div>
            <h2>{tt({ tr: "Çerezler", en: "Cookies" })}</h2>
            <p>
              {tt({
                tr: "Web sürümü yalnızca oturumunu açık tutmak için gerekli teknik çerezleri kullanır. Pazarlama amaçlı takip çerezi kullanılmaz.",
                en: "The web version uses only technical cookies required to keep you signed in. No marketing tracking cookies are used.",
              })}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
