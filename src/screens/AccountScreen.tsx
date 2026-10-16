import { useState } from "react";
import { AlertTriangle, CheckCircle2, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";
import { SubscriptionCard } from "../components/SubscriptionCard";

// FireVibe'ın gerçek src/routes/account.tsx dosyasından taşınmıştır.
// Hesap silme, gerçek şemamızda "on delete cascade" olduğu için
// FireVibe'daki gibi tabloları tek tek silmemize gerek yok — sadece
// auth.users satırı Edge Function ile siliniyor, gerisi otomatik gidiyor.

export function AccountScreen({ email }: { email: string }) {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const deleteWord = tt({ tr: "SİL", en: "DELETE" });

  async function remove() {
    setError("");
    setBusy(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const { data, error: fnError } = await supabase.functions.invoke("delete-account", {
      body: { confirmation: confirm },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    // Supabase, 4xx/5xx yanıtında `data`yı vermez; gövdeden gerekçeyi oku.
    let reason: string | undefined = data?.reason;
    if (fnError && !reason) {
      try { reason = (await (fnError as { context?: Response }).context?.json())?.reason; } catch { /* gövde yok */ }
    }
    if (fnError || !data?.ok) {
      const messages: Record<string, string> = {
        "subscription-cancel-failed": tt({ tr: "Aboneliğin iptal edilemediği için hesabın SİLİNMEDİ ve ücretlendirme devam edebilir. Lütfen tekrar dene; olmazsa destek ile iletişime geç.", en: "We couldn't cancel your subscription, so your account was NOT deleted and billing may continue. Please try again; if it keeps failing, contact support." }),
        unverifiable: tt({ tr: "Abonelik durumun doğrulanamadı, bu yüzden hesabın silinmedi. Biraz sonra tekrar dene.", en: "We couldn't verify your subscription, so your account was not deleted. Please try again shortly." }),
        "delete-failed": tt({ tr: "Aboneliğin iptal edildi ancak hesap silinemedi. Lütfen tekrar dene.", en: "Your subscription was cancelled but the account could not be deleted. Please try again." }),
      };
      setError(messages[reason ?? ""] ?? tt({ tr: "Hesap silinemedi. Lütfen tekrar deneyin.", en: "We could not delete your account. Please try again." }));
      setBusy(false);
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <main className="account-page" style={{ minHeight: 0, padding: 0 }}>
      <div className="account-wrap">
        <p className="eyebrow blue-label">{tt({ tr: "Güvenlik ve kontrol", en: "Security and control" })}</p>
        <h1>{tt({ tr: "Hesabın senin.", en: "Your account, your control." })}</h1>
        <p className="account-lead">
          {email} · {tt({ tr: "Verilerini ve çalışma alanını buradan yönet.", en: "Manage your data and workspace here." })}
        </p>

        <section className="account-card">
          <ShieldCheck size={22} />
          <div>
            <h2>{tt({ tr: "Oturumu kapat", en: "Sign out" })}</h2>
            <p>{tt({ tr: "Bu cihazdaki oturumunu güvenli şekilde sonlandır.", en: "Safely end your session on this device." })}</p>
          </div>
          <button className="secondary-button" onClick={() => supabase.auth.signOut()}>
            <LogOut size={15} /> {tt({ tr: "Çıkış yap", en: "Sign out" })}
          </button>
        </section>

        <SubscriptionCard />

        <section className="account-card danger-card">
          <AlertTriangle size={22} />
          <div>
            <h2>{tt({ tr: "Hesabı ve verileri sil", en: "Delete account and data" })}</h2>
            <p>
              {tt({
                tr: "İşletme, randevu, görev ve kişisel kayıtların kalıcı olarak silinir. Bu işlem geri alınamaz.",
                en: "Your business, appointments, tasks and personal records will be permanently deleted. This cannot be undone.",
              })}
            </p>
            <label>
              {tt({ tr: `Onay için ${deleteWord} yaz`, en: `Type ${deleteWord} to confirm` })}
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="confirm-delete" />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <button className="danger-button" disabled={confirm !== deleteWord || busy} onClick={remove}>
            <Trash2 size={15} /> {busy ? tt({ tr: "Siliniyor…", en: "Deleting…" }) : tt({ tr: "Hesabı sil", en: "Delete account" })}
          </button>
        </section>

        <p className="account-safe">
          <CheckCircle2 size={15} /> {tt({ tr: "Ödeme veya kart bilgisi tutulmaz.", en: "No payment or card details are stored." })}
        </p>
      </div>
    </main>
  );
}
