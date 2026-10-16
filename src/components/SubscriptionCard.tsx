import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { supabase } from "../lib/supabase";
import { tt } from "../lib/i18n";
import { effectivePlan, graceEndsAt } from "../../supabase/functions/_shared/entitlement";

// Hesap ekranındaki abonelik kartı: aktif plan, durum, yenileme/iptal tarihi, plan değiştirme, dönem sonunda iptal,
// planlı iptali geri alma, Paddle müşteri portalı. Tüm değişiklikler SUNUCUDA (manage-subscription / create-checkout) yapılır;
// başarısızlıkta başarı mesajı GÖSTERİLMEZ.
interface Row {
  plan: string; status: string; current_period_end: string | null; cancel_at: string | null;
  scheduled_action: string | null; past_due_since: string | null; pending_plan: string | null; pending_plan_at: string | null;
}
const PLAN_NAME: Record<string, string> = { free: "Free", personal: "Personal", solo: "Solo", studio: "Studio" };
const fmt = (iso: string | null) => (iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleDateString() : "");

export function SubscriptionCard() {
  const [row, setRow] = useState<Row | null | undefined>(undefined); // undefined = yükleniyor
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("subscriptions")
      .select("plan, status, current_period_end, cancel_at, scheduled_action, past_due_since, pending_plan, pending_plan_at").maybeSingle();
    setRow(error ? null : (data as Row | null));
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function act(action: "portal" | "cancel" | "resume") {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.functions.invoke("manage-subscription", { body: { action } });
    setBusy(false);
    if (error || !data?.ok) {
      setMsg({ ok: false, text: tt({ tr: "İşlem tamamlanamadı; aboneliğinde bir değişiklik YAPILMADI. Lütfen tekrar dene.", en: "The action could not be completed; your subscription was NOT changed. Please try again." }) });
      return;
    }
    if (action === "portal") { window.location.assign(data.url); return; }
    setMsg({ ok: true, text: action === "cancel"
      ? tt({ tr: "İptal dönem sonunda gerçekleşecek; o zamana kadar planını kullanırsın.", en: "Cancellation will take effect at the end of the period; you keep your plan until then." })
      : tt({ tr: "Planlanan iptal geri alındı.", en: "The scheduled cancellation was reverted." }) });
    setTimeout(() => void load(), 3000); // webhook'un DB'ye yansıtmasını bekle
  }

  if (row === undefined) return null;
  const paid = !!row && row.plan !== "free" && row.status !== "canceled";
  const eff = effectivePlan(row, Date.now());
  const grace = row ? graceEndsAt(row) : null;
  const cancelling = row?.scheduled_action === "cancel";

  return (
    <section className="account-card" style={{ flexWrap: "wrap" }}>
      <CreditCard size={22} />
      <div style={{ flex: 1, minWidth: 220 }}>
        <h2>{tt({ tr: "Plan ve abonelik", en: "Plan and subscription" })}</h2>
        <p>
          {tt({ tr: "Aktif plan", en: "Current plan" })}: <b>{PLAN_NAME[eff] ?? eff}</b>
          {paid && <> · {tt({ tr: "Durum", en: "Status" })}: {row!.status}</>}
        </p>
        {paid && !cancelling && row!.current_period_end && <p>{tt({ tr: "Sonraki yenileme", en: "Next renewal" })}: {fmt(row!.current_period_end)}</p>}
        {paid && cancelling && <p>{tt({ tr: "İptal edilecek", en: "Ends on" })}: {fmt(row!.cancel_at)}</p>}
        {row?.pending_plan && <p>{tt({ tr: "Planlanan düşürme", en: "Scheduled downgrade" })}: {PLAN_NAME[row.pending_plan]} · {fmt(row.pending_plan_at)}</p>}
        {grace && eff !== "free" && <p style={{ color: "#b45309" }}>{tt({ tr: `Ödeme alınamadı. ${fmt(grace)} tarihine kadar erişimin sürer; ödeme yöntemini güncelle.`, en: `Payment failed. Your access continues until ${fmt(grace)}; please update your payment method.` })}</p>}
        {row?.status === "past_due" && eff === "free" && <p style={{ color: "#b91c1c" }}>{tt({ tr: "Ödeme sorunu nedeniyle ücretli erişim durdu. Ödeme yöntemini güncelle.", en: "Paid access stopped due to a payment problem. Update your payment method." })}</p>}
        {msg && <p role="status" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.text}</p>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="secondary-button" to="/pricing">{paid ? tt({ tr: "Planı değiştir", en: "Change plan" }) : tt({ tr: "Plan seç", en: "Choose a plan" })}</Link>
        {paid && <button className="secondary-button" disabled={busy} onClick={() => act("portal")}>{tt({ tr: "Ödeme yöntemi ve faturalar", en: "Payment method & invoices" })}</button>}
        {paid && !cancelling && <button className="secondary-button" disabled={busy} onClick={() => { if (window.confirm(tt({ tr: "Abonelik dönem sonunda iptal edilsin mi?", en: "Cancel the subscription at the end of the period?" }))) void act("cancel"); }}>{tt({ tr: "Dönem sonunda iptal et", en: "Cancel at period end" })}</button>}
        {paid && cancelling && <button className="secondary-button" disabled={busy} onClick={() => act("resume")}>{tt({ tr: "İptali geri al", en: "Undo cancellation" })}</button>}
      </div>
    </section>
  );
}
