// Planmoy — Paylaşımlı maliyet tavanı kontrolü.
//
// İKİ katmanlı koruma (kullanıcının "ödediğinden fazlasını harcatma" kuralı):
//  1) Kullanıcı başı aylık tavan — plana göre (ödediği ücretin altında).
//  2) Ücretsiz HAVUZ — ücretsiz + anonim (Demo) kullanıcıların o ayki TOPLAM harcaması
//     FREE_POOL_CAP_USD'yi geçemez. Demo düğmesiyle sınırsız hesap açılıp her birinin
//     ayrı tavanı harcanamasın diye. Dolunca sadece ücretsiz kullanıcılar etkilenir;
//     ücretli planlar bu havuza hiç girmez.
const MONTHLY_COST_CAP_USD: Record<string, number> = {
  free: 0.5,
  personal: 1.2,
  solo: 2.5,
  studio: 6.5,
};

export const FREE_POOL_CAP_USD = 50;

export type CostResult = { allowed: boolean; reason?: "monthly-cost-cap-reached" | "free-pool-cap-reached" | "pool-check-failed" };

export async function getPlan(admin: any, userId: string): Promise<string> {
  const { data: sub } = await admin.from("subscriptions").select("plan, status").eq("user_id", userId).maybeSingle();
  return sub?.status === "active" ? sub.plan ?? "free" : "free";
}

export async function checkAndChargeCost(admin: any, userId: string, estimatedCostUsd: number): Promise<CostResult> {
  const month = new Date().toISOString().slice(0, 7);
  const plan = await getPlan(admin, userId);
  const cap = MONTHLY_COST_CAP_USD[plan] ?? MONTHLY_COST_CAP_USD.free;

  const { data: usage } = await admin.from("user_usage_cost").select("estimated_cost_usd").eq("user_id", userId).eq("month", month).maybeSingle();
  const current = Number(usage?.estimated_cost_usd ?? 0);
  if (current + estimatedCostUsd > cap) return { allowed: false, reason: "monthly-cost-cap-reached" };

  // Ücretsiz havuz (yalnızca ücretsiz plan; muaf hesaplar hariç)
  if (plan === "free") {
    const { data: exempt } = await admin.from("cost_exempt_users").select("user_id").eq("user_id", userId).maybeSingle();
    if (!exempt) {
      const { data: ok, error } = await admin.rpc("charge_free_pool", { p_month: month, p_amount: estimatedCostUsd, p_cap: FREE_POOL_CAP_USD });
      if (error) return { allowed: false, reason: "pool-check-failed" }; // güvenli taraf: emin değilsek harcatma
      if (!ok) return { allowed: false, reason: "free-pool-cap-reached" };
    }
  }

  await admin.from("user_usage_cost").upsert(
    { user_id: userId, month, estimated_cost_usd: current + estimatedCostUsd, updated_at: new Date().toISOString() },
    { onConflict: "user_id,month" }
  );
  return { allowed: true };
}
