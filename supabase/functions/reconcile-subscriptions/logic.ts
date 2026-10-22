// Planmoy — Abonelik mutabakatı (Paddle <-> subscriptions). Dış import: yalnızca _shared/paddle-core (saf).
// MODLAR:
//   report (VARSAYILAN, salt-okuma)  : yalnızca farkları raporlar, hiçbir şey yazmaz.
//   repair            (varsayılan KAPALI): yalnız "Paddle canceled ama DB canlı" satırını free/canceled yapar (CAS + denetim kaydı).
//   apply-downgrades  (varsayılan KAPALI): vadesi yaklaşan `pending_plan` düşürmelerini Paddle'a uygular (doğrular, sonra bekleyeni temizler).
// İlkeler: ödeme geçmişi Paddle'dadır, asla silinmez; satır silinmez; her yazma koşullu (CAS) => tekrar çalıştırma güvenli (idempotent);
// okuma hatası/eksik sayfa => hata döner (sessiz başarı YOK); her yazma subscription_repairs'a denetim kaydı bırakır.
import { DOWNGRADE_MODE_AFTER_RENEWAL, DOWNGRADE_MODE_BEFORE_RENEWAL, mapStatus, tierFromData, type PaidTier } from "../_shared/paddle-core.ts";

export const LIVE = ["active", "trialing", "past_due", "paused"];
export const DOWNGRADE_LEAD_MS = 24 * 60 * 60 * 1000; // dönem bitmeden en fazla 24 sa önce uygula
const RANK: Record<string, number> = { free: 0, personal: 1, solo: 2, studio: 3 };

// deno-lint-ignore no-explicit-any
export type PaddleSub = any; // Paddle abonelik nesnesi (data[i])
export interface DbRow {
  user_id: string; plan: string; status: string; paddle_subscription_id: string | null;
  last_event_at: string | null; pending_plan: string | null; pending_plan_at: string | null;
}

export type Kind =
  | "paddle-canceled-db-live" | "status-mismatch" | "plan-mismatch" | "missing-in-paddle" | "live-without-db"
  | "user-mismatch" | "duplicate-live" | "unknown-price" | "pending-downgrade-due" | "pending-downgrade-stale";
export interface Finding { kind: Kind; severity: "high" | "medium" | "low"; user: string; sub: string; detail: string; repairable: boolean }

const mSub = (s: string | null) => (s ? "…" + s.slice(-6) : "(yok)");
const mUser = (s: string | null) => (s ? s.slice(0, 6) + "…" : "(yok)");
const ownerOf = (p: PaddleSub): string | null => (typeof p?.custom_data?.supabase_user_id === "string" ? p.custom_data.supabase_user_id : null);

/** Bekleyen düşürme şimdi uygulanabilir mi? (vade yaklaştı + Paddle aboneliği temiz/aktif + plan DB ile aynı + sahip aynı) */
function downgradeDue(r: DbRow, p: PaddleSub, nowMs: number, priceTier: Record<string, PaidTier>): boolean {
  if (!r.pending_plan || !r.pending_plan_at) return false;
  const at = Date.parse(r.pending_plan_at);
  if ((RANK[r.pending_plan] ?? 99) >= (RANK[r.plan] ?? -1) || !Number.isFinite(at)) return false;
  if (nowMs < at - DOWNGRADE_LEAD_MS) return false;
  if (mapStatus(p.status).status !== "active" || p.scheduled_change || ownerOf(p) !== r.user_id) return false;
  const t = tierFromData(p, priceTier);
  return t.kind === "tier" && t.tier === r.plan; // Paddle'daki gerçek plan DB ile aynı olmalı
}

export function compare(paddle: PaddleSub[], rows: DbRow[], priceTier: Record<string, PaidTier>, nowMs: number): Finding[] {
  const out: Finding[] = [];
  const byId = new Map<string, PaddleSub>(paddle.map((p) => [p.id, p]));
  const add = (f: Omit<Finding, "user" | "sub"> & { user: string | null; sub: string | null }) => out.push({ ...f, user: mUser(f.user), sub: mSub(f.sub) });

  for (const r of rows) {
    if (!r.paddle_subscription_id) continue;
    const p = byId.get(r.paddle_subscription_id);
    if (!p) { add({ kind: "missing-in-paddle", severity: "medium", user: r.user_id, sub: r.paddle_subscription_id, detail: `DB=${r.plan}/${r.status}, Paddle'da yok`, repairable: false }); continue; }
    const owner = ownerOf(p);
    const sameUser = owner === r.user_id;
    if (!sameUser) add({ kind: "user-mismatch", severity: "high", user: r.user_id, sub: r.paddle_subscription_id, detail: "Paddle custom_data kullanıcısı DB satırıyla aynı değil", repairable: false });
    const { status: expStatus, known } = mapStatus(p.status);
    const t = tierFromData(p, priceTier);
    if (t.kind !== "tier" && expStatus !== "canceled") add({ kind: "unknown-price", severity: "high", user: r.user_id, sub: r.paddle_subscription_id, detail: `fiyat eşlemesi: ${t.kind}`, repairable: false });
    const expPlan = expStatus === "canceled" ? "free" : t.kind === "tier" ? t.tier : null;

    if (expStatus === "canceled" && (r.status !== "canceled" || r.plan !== "free")) {
      add({ kind: "paddle-canceled-db-live", severity: "high", user: r.user_id, sub: r.paddle_subscription_id, detail: `Paddle=canceled, DB=${r.plan}/${r.status}`, repairable: sameUser });
    } else if (expStatus !== "canceled") {
      if (r.status !== expStatus || !known) add({ kind: "status-mismatch", severity: "high", user: r.user_id, sub: r.paddle_subscription_id, detail: `Paddle=${p.status}, DB=${r.status}`, repairable: false });
      if (expPlan && r.plan !== expPlan) add({ kind: "plan-mismatch", severity: "high", user: r.user_id, sub: r.paddle_subscription_id, detail: `Paddle fiyatı=${expPlan}, DB=${r.plan}`, repairable: false });
    }

    if (r.pending_plan) {
      const at = r.pending_plan_at ? Date.parse(r.pending_plan_at) : NaN;
      const valid = (RANK[r.pending_plan] ?? 99) < (RANK[r.plan] ?? -1) && Number.isFinite(at);
      if (!valid || expStatus === "canceled" || p.scheduled_change?.action === "cancel") {
        add({ kind: "pending-downgrade-stale", severity: "low", user: r.user_id, sub: r.paddle_subscription_id, detail: `bekleyen=${r.pending_plan}, plan=${r.plan}`, repairable: false });
      } else if (nowMs >= at - DOWNGRADE_LEAD_MS) {
        add({ kind: "pending-downgrade-due", severity: "medium", user: r.user_id, sub: r.paddle_subscription_id, detail: `${r.plan} -> ${r.pending_plan} (dönem sonu ${r.pending_plan_at})`, repairable: downgradeDue(r, p, nowMs, priceTier) });
      }
    }
  }

  const known = new Set(rows.map((r) => r.paddle_subscription_id).filter(Boolean));
  const liveByUser = new Map<string, string[]>();
  for (const p of paddle) {
    if (!LIVE.includes(p.status)) continue;
    const o = ownerOf(p);
    if (o) liveByUser.set(o, [...(liveByUser.get(o) ?? []), p.id]);
    if (!known.has(p.id)) add({ kind: "live-without-db", severity: "high", user: o, sub: p.id, detail: `Paddle=${p.status}, DB'de bu kimliğe satır yok`, repairable: false });
  }
  for (const [u, ids] of liveByUser) if (ids.length > 1) add({ kind: "duplicate-live", severity: "high", user: u, sub: ids.join(","), detail: `${ids.length} canlı abonelik (çift tahsilat riski)`, repairable: false });
  return out;
}

export interface ReconcileDeps {
  now: () => number;
  priceTier: Record<string, PaidTier>;
  readonly flags: { repair: boolean; applyDowngrades: boolean }; // sunucu tarafı (env) izinleri; varsayılan KAPALI
  listPaddle(): Promise<PaddleSub[]>; // eksik sayfa => fırlat
  listRows(): Promise<DbRow[]>;
  /** CAS: (user, sub, plan, status, last_event_at) hâlâ aynıysa free/canceled yapar; etkilenen satır sayısı. */
  repairCanceled(row: DbRow): Promise<number>;
  priceIdFor(plan: PaidTier): string | undefined;
  /** Sandbox izolasyonu: yazma (onarım/düşürme) yalnızca izinli kullanıcılar için. production ortamında hepsi true. */
  userAllowed(userId: string): boolean;
  getLive(subId: string): Promise<{ status: string; scheduled_change: unknown; price_ids: string[]; period_end: string | null } | null>;
  changePlan(subId: string, priceId: string, mode: string): Promise<void>;
  /** CAS: pending_plan hâlâ `expected` ise temizler. */
  clearPendingIf(userId: string, expected: string): Promise<number>;
  audit(e: { user_id: string; paddle_subscription_id: string; old_plan: string; old_status: string; new_plan: string; new_status: string; reason: string }): Promise<void>;
  log: { error: (...a: unknown[]) => void; warn: (...a: unknown[]) => void };
}
export interface Options { mode: "report" | "repair" | "apply-downgrades" }
export interface Action { kind: "repair" | "downgrade"; user: string; sub: string; result: "done" | "skipped-already-changed" | "refused" | "failed"; note?: string }
export interface Report { ok: boolean; mode: string; reason?: string; counts: Record<string, number>; findings: Finding[]; actions: Action[]; errors: string[]; wrote: boolean }

export async function reconcile(deps: ReconcileDeps, opts: Options): Promise<Report> {
  const base = { mode: opts.mode, counts: {}, findings: [], actions: [], errors: [], wrote: false };
  let paddle: PaddleSub[]; let rows: DbRow[];
  try { [paddle, rows] = await Promise.all([deps.listPaddle(), deps.listRows()]); }
  catch (e) { return { ...base, ok: false, reason: "read-failed", errors: [e instanceof Error ? e.message : String(e)] }; }

  const nowMs = deps.now();
  const findings = compare(paddle, rows, deps.priceTier, nowMs);
  const counts: Record<string, number> = {};
  for (const f of findings) counts[f.kind] = (counts[f.kind] ?? 0) + 1;
  const rep: Report = { ...base, ok: true, counts, findings, actions: [], errors: [] };

  if (opts.mode === "report") return rep;
  const allowed = opts.mode === "repair" ? deps.flags.repair : deps.flags.applyDowngrades;
  if (!allowed) return { ...rep, ok: false, reason: "mode-disabled" }; // sunucu izni yok: sessiz başarı YOK, hiçbir şey yazılmadı

  const paddleOf = new Map(paddle.map((p) => [p.id, p]));
  // findings maskelidir; eylemler ham satırlardan, aynı koşullarla türetilir.
  const candidates = rows.filter((r) => {
    const p = r.paddle_subscription_id ? paddleOf.get(r.paddle_subscription_id) : undefined;
    if (!p) return false;
    if (!deps.userAllowed(r.user_id)) return false; // izin listesi dışındaki kullanıcıya YAZILMAZ
    return opts.mode === "repair"
      ? mapStatus(p.status).status === "canceled" && (r.status !== "canceled" || r.plan !== "free") && ownerOf(p) === r.user_id
      : downgradeDue(r, p, nowMs, deps.priceTier);
  });

  for (const r of candidates) {
    const sub = r.paddle_subscription_id!;
    const tag = { user: mUser(r.user_id), sub: mSub(sub) };
    try {
      if (opts.mode === "repair") {
        const n = await deps.repairCanceled(r);
        if (n === 0) { rep.actions.push({ kind: "repair", ...tag, result: "skipped-already-changed" }); continue; }
        if (n !== 1) throw new Error(`beklenen 1 satır, ${n} etkilendi`);
        rep.wrote = true;
        await deps.audit({ user_id: r.user_id, paddle_subscription_id: sub, old_plan: r.plan, old_status: r.status, new_plan: "free", new_status: "canceled", reason: "reconcile-subscriptions: Paddle canceled, DB canlıydı" });
        rep.actions.push({ kind: "repair", ...tag, result: "done" });
        continue;
      }
      // apply-downgrades
      const target = r.pending_plan as PaidTier;
      const priceId = deps.priceIdFor(target);
      if (!priceId) { rep.actions.push({ kind: "downgrade", ...tag, result: "refused", note: "hedef fiyat yapılandırılmamış" }); continue; }
      const live = await deps.getLive(sub);
      if (!live || live.status !== "active" || live.scheduled_change) { rep.actions.push({ kind: "downgrade", ...tag, result: "refused", note: "canlı abonelik uygun değil" }); continue; }
      const liveTier = live.price_ids.length === 1 ? deps.priceTier[live.price_ids[0]] : undefined;
      if (liveTier !== r.plan) { rep.actions.push({ kind: "downgrade", ...tag, result: "refused", note: "Paddle planı DB ile uyuşmuyor" }); continue; }
      const periodEnd = live.period_end ? Date.parse(live.period_end) : NaN;
      const mode = Number.isFinite(periodEnd) && periodEnd > nowMs ? DOWNGRADE_MODE_BEFORE_RENEWAL : DOWNGRADE_MODE_AFTER_RENEWAL;
      await deps.changePlan(sub, priceId, mode);
      const after = await deps.getLive(sub);
      if (!after || !after.price_ids.includes(priceId) || after.price_ids.length !== 1) throw new Error("düşürme Paddle'da doğrulanamadı");
      rep.wrote = true;
      await deps.audit({ user_id: r.user_id, paddle_subscription_id: sub, old_plan: r.plan, old_status: r.status, new_plan: target, new_status: r.status, reason: `reconcile-subscriptions: dönem sonu düşürme uygulandı (${mode})` });
      await deps.clearPendingIf(r.user_id, target); // webhook da temizler; yarışta CAS zararsız
      rep.actions.push({ kind: "downgrade", ...tag, result: "done", note: mode });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      deps.log.error("reconcile eylemi başarısız:", msg);
      rep.errors.push(`${tag.sub}: ${msg}`);
      rep.actions.push({ kind: opts.mode === "repair" ? "repair" : "downgrade", ...tag, result: "failed", note: msg });
    }
  }
  if (rep.errors.length) rep.ok = false; // kısmi başarı sessiz geçmez
  return rep;
}
