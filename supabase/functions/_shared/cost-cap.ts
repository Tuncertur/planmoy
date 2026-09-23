// Planmoy — Paylaşımlı maliyet tavanı kontrolü. Bir kullanıcının o ay
// tetiklediği tahmini gerçek dış-API maliyeti, ödediği abonelik
// ücretinin bir kısmını (kâr payı bırakacak şekilde) aşmasın.
const MONTHLY_COST_CAP_USD: Record<string, number> = {
  free: 0.15,
  personal: 1.2,
  solo: 2.5,
  studio: 6.5,
};

export async function checkAndChargeCost(admin: any, userId: string, estimatedCostUsd: number): Promise<{ allowed: boolean; reason?: string }> {
  const month = new Date().toISOString().slice(0, 7);
  const { data: sub } = await admin.from("subscriptions").select("plan, status").eq("user_id", userId).maybeSingle();
  const plan = sub?.status === "active" ? sub.plan ?? "free" : "free";
  const cap = MONTHLY_COST_CAP_USD[plan] ?? MONTHLY_COST_CAP_USD.free;

  const { data: usage } = await admin.from("user_usage_cost").select("estimated_cost_usd").eq("user_id", userId).eq("month", month).maybeSingle();
  const current = usage?.estimated_cost_usd ?? 0;

  if (current + estimatedCostUsd > cap) {
    return { allowed: false, reason: "monthly-cost-cap-reached" };
  }

  await admin.from("user_usage_cost").upsert(
    { user_id: userId, month, estimated_cost_usd: current + estimatedCostUsd, updated_at: new Date().toISOString() },
    { onConflict: "user_id,month" }
  );
  return { allowed: true };
}
