import { ArrowRight, Building2, Check, Clock3, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/routes/pricing.tsx dosyasından taşınmıştır.
// Ödeme/checkout bilinçli olarak bağlanmadı (kullanıcı kararı) —
// butonlar kayıt ekranına götürüyor, gerçek bir satın alma yapmıyor.

type Plan = { name: string; price: string; description: string; features: { tr: string; en: string }[]; icon: React.ReactNode; featured?: boolean };

const plans: Plan[] = [
  {
    name: "Free start",
    price: "$0",
    description: tt({ tr: "Hesap açınca 20 AI sorgusu dahil · ödeme yok", en: "20 AI queries included when you create an account · no payment" }),
    icon: <Clock3 size={20} />,
    features: [
      { tr: "Temel takvim ve randevu akışı", en: "Core calendar and booking flow" },
      { tr: "Kişisel veya işletme alanı", en: "Personal or business space" },
      { tr: "20 AI sorgusu · ilk kurulum", en: "20 AI queries · first setup" },
    ],
  },
  {
    name: "Personal",
    price: "$1.99",
    description: tt({ tr: "Kişisel planlama için hafif ve güçlü.", en: "Lightweight and powerful personal planning." }),
    icon: <UserRound size={20} />,
    features: [
      { tr: "Sınırsız kişisel randevu ve görev", en: "Unlimited personal appointments and tasks" },
      { tr: "Akıllı hatırlatıcılar ve hızlı destek", en: "Smart reminders and fast assistance" },
      { tr: "1.000 AI sorgusu / ay", en: "1,000 AI queries / month" },
    ],
  },
  {
    name: "Solo",
    price: "$4.99",
    description: tt({ tr: "Tek kişilik hizmet işletmeleri için.", en: "For one-person service businesses." }),
    icon: <Sparkles size={20} />,
    featured: true,
    features: [
      { tr: "Tek kişi işletmesi için online rezervasyon", en: "Online booking for one-person businesses" },
      { tr: "Müşteri notları ve otomatik hatırlatmalar", en: "Client notes and automated reminders" },
      { tr: "2.000 AI sorgusu / ay", en: "2,000 AI queries / month" },
    ],
  },
  {
    name: "Studio",
    price: "$12.99",
    description: tt({ tr: "Büyüyen ekipler için hızlı çalışma alanı.", en: "A fast workspace for growing teams." }),
    icon: <Building2 size={20} />,
    features: [
      { tr: "Ekip takvimi ve rol bazlı çalışma", en: "Team calendar and role-based workspace" },
      { tr: "Hizmet, müşteri ve yoğunluk görünümü", en: "Services, clients and capacity view" },
      { tr: "3.000 AI sorgusu / ay", en: "3,000 AI queries / month" },
    ],
  },
];

export function PricingScreen() {
  return (
    <main className="pricing-page">
      <header className="pricing-header">
        <Link to="/" className="auth-brand">
          plan<span>moy</span>
          <i />
        </Link>
        <Link to="/" className="pricing-signin">
          {tt({ tr: "Zaten hesabın var mı? Giriş yap", en: "Already have an account? Sign in" })}
        </Link>
      </header>

      <section className="pricing-hero">
        <p className="eyebrow">{tt({ tr: "Sade ve ulaşılabilir planlar", en: "Simple, accessible plans" })}</p>
        <h1>{tt({ tr: "İşine ve akışına uygun planı seç.", en: "Choose the plan for your work and flow." })}</h1>
        <p>{tt({ tr: "Kişisel kullanımda güçlü bir başlangıç; işletmelerde hızlı ve net randevu yönetimi. Kart gerekmez.", en: "A strong personal start, with fast and clear booking management for businesses. No card required." })}</p>
        <div className="trial-badge">
          <ShieldCheck size={16} />
          <strong>{tt({ tr: "İlk kurulum ücretsiz", en: "Free first setup" })}</strong>
          <span>{tt({ tr: "Hesap açınca 20 AI sorgusu dahil · ödeme yok", en: "20 AI queries included when you create an account · no payment" })}</span>
        </div>
      </section>

      <section className="pricing-grid">
        {plans.map((plan) => (
          <article key={plan.name} className={`pricing-card ${plan.featured ? "featured" : ""}`}>
            <div className="pricing-card-top">
              <span className="pricing-icon">{plan.icon}</span>
              {plan.featured && <span className="pricing-popular">{tt({ tr: "En iyi başlangıç", en: "Best starting point" })}</span>}
            </div>
            <h2>{plan.name}</h2>
            <p className="pricing-description">{plan.description}</p>
            <div className="pricing-price">
              <strong>{plan.price}</strong>
              <span>{tt({ tr: "aylık", en: "monthly" })}</span>
            </div>
            <ul>
              {plan.features.map((f) => (
                <li key={f.tr}>
                  <Check size={14} />
                  {tt(f)}
                </li>
              ))}
            </ul>
            <Link to="/" className="pricing-cta">
              {plan.name === "Free start" ? tt({ tr: "Ücretsiz başla", en: "Start free" }) : tt({ tr: "Bu planla başla", en: "Start with this plan" })}
              <ArrowRight size={15} />
            </Link>
          </article>
        ))}
      </section>

      <section className="pricing-ai-note">
        <Sparkles size={18} />
        <div>
          <strong>{tt({ tr: "AI sorgusu", en: "AI queries" })}</strong>
          <p>{tt({ tr: "Her AI sorgusu planındaki kotadan düşer.", en: "Every AI query uses your plan allowance." })}</p>
        </div>
      </section>

      <p className="pricing-note">
        <b>{tt({ tr: "Kotalar ve farklar: ", en: "Limits and differences: " })}</b>
        {tt({
          tr: "Ödeme veya checkout şu anda bağlı değil. Fiyatlar aktivasyon öncesi açıkça doğrulanır.",
          en: "Payments and checkout are not connected yet. Prices will be confirmed clearly before activation.",
        })}{" "}
        <Link to="/legal">{tt({ tr: "Kullanım koşulları ve gizlilik", en: "Terms and privacy" })}</Link>
      </p>
    </main>
  );
}