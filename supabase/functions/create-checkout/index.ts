// Planmoy — Sunucu tarafında Paddle ödeme/plan değişikliği.
//
// Neden sunucuda: Paddle.js'e istemciden `customData` verilirse kullanıcı supabase_user_id'yi
// değiştirebilir. Kullanıcı kimliği JWT'den DOĞRULANIR, fiyat ID'si sunucu secret'larından okunur,
// custom_data sunucuda yazılır. Karar mantığı `logic.ts` içindedir (otomatik testli).
//
// Davranış:
//  - Aktif aboneliği olmayan kullanıcı: Paddle işlemi (transaction) oluşturulur / bekleyen işlem yeniden kullanılır.
//  - Aktif aboneliği olan kullanıcı: yeni abonelik AÇILMAZ. Yükseltme hemen (Paddle PATCH); DÜŞÜRME dönem sonunda
//    uygulanmak üzere `pending_plan` olarak saklanır (uygulayan: reconcile-subscriptions).
//
// Gerekli Supabase secrets (yoksa fonksiyon "not-configured" döner, canlıya sessizce düşmez):
//   PADDLE_API_KEY, PADDLE_ENVIRONMENT ("sandbox" | "production"),
//   PADDLE_PRICE_PERSONAL, PADDLE_PRICE_SOLO, PADDLE_PRICE_STUDIO
// Sandbox izolasyonu: PADDLE_ENVIRONMENT=sandbox iken yalnızca SANDBOX_TEST_USER_IDS listesindeki kullanıcılar ödeme açabilir (fail-closed).
// Gerekli tablolar/sütunlar: checkout_locks (0027), subscriptions.pending_plan* (0029).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { parseUserAllowlist, userAllowedFor } from "../_shared/paddle-core.ts";
import { handleCheckout, PRICE_ENV, type CheckoutDeps, type ExistingSub, type Lock, type LockStore, type PaddleApi } from "./logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UNIQUE_VIOLATION = "23505";

function paddleEnvironment(): "sandbox" | "production" | null {
  const v = Deno.env.get("PADDLE_ENVIRONMENT");
  return v === "sandbox" || v === "production" ? v : null; // belirsizse null: canlıya varsayılan YOK
}

function makePaddle(base: string, apiKey: string): PaddleApi {
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return res;
  };
  return {
    async createTransaction(priceId, userId, plan) {
      const res = await call("POST", "/transactions", {
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: { supabase_user_id: userId, tier: plan },
      });
      if (!res.ok) throw new Error(`Paddle transaction oluşturulamadı: ${res.status} ${await res.text().catch(() => "")}`);
      const id = (await res.json())?.data?.id;
      if (typeof id !== "string") throw new Error("Paddle transaction kimliği dönmedi");
      return id;
    },
    async getTransactionStatus(transactionId) {
      const res = await call("GET", `/transactions/${encodeURIComponent(transactionId)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Paddle transaction okunamadı: ${res.status}`);
      return (await res.json())?.data?.status ?? null;
    },
    async getSubscription(subscriptionId) {
      const res = await call("GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Paddle abonelik okunamadı: ${res.status}`);
      const d = (await res.json())?.data;
      return d ? { status: d.status, scheduled_change: d.scheduled_change ?? null, period_end: d.current_billing_period?.ends_at ?? null } : null;
    },
    async changePlan(subscriptionId, priceId, prorationMode) {
      const res = await call("PATCH", `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        items: [{ price_id: priceId, quantity: 1 }], // tam kalem listesi: aboneliğin tek kalemi
        proration_billing_mode: prorationMode,
      });
      if (!res.ok) throw new Error(`Paddle plan değişikliği reddedildi: ${res.status} ${await res.text().catch(() => "")}`);
    },
  };
}

function makeLockStore(admin: ReturnType<typeof createClient<any>>): LockStore {
  return {
    async insert(userId, lock) {
      const { error } = await admin.from("checkout_locks").insert({ user_id: userId, ...lock });
      if (!error) return "ok";
      if (error.code === UNIQUE_VIOLATION) return "exists";
      throw new Error(`checkout_locks insert hatası: ${error.code ?? ""} ${error.message}`);
    },
    async get(userId) {
      const { data, error } = await admin.from("checkout_locks").select("plan, transaction_id, expires_at").eq("user_id", userId).maybeSingle();
      if (error) throw new Error(`checkout_locks okuma hatası: ${error.message}`);
      return (data as Lock | null) ?? null;
    },
    async replaceIf(userId, expectedExpiresAt, lock) {
      const { data, error } = await admin
        .from("checkout_locks")
        .update(lock)
        .eq("user_id", userId)
        .eq("expires_at", expectedExpiresAt)
        .select("user_id");
      if (error) throw new Error(`checkout_locks güncelleme hatası: ${error.message}`);
      return !!data && data.length > 0;
    },
    async setTransaction(userId, transactionId, expiresAt) {
      const { error } = await admin.from("checkout_locks").update({ transaction_id: transactionId, expires_at: expiresAt }).eq("user_id", userId);
      if (error) throw new Error(`checkout_locks işlem kaydı hatası: ${error.message}`);
    },
    async remove(userId) {
      const { error } = await admin.from("checkout_locks").delete().eq("user_id", userId);
      if (error) throw new Error(`checkout_locks silme hatası: ${error.message}`);
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, reason: "method-not-allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, reason: "no-auth" }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ ok: false, reason: "invalid-session" }, 401);
  // Demo (anonim) hesapla satın alma: çıkışta hesap ve abonelik kaybolur. (200: istemci nedeni okuyabilsin)
  if (user.is_anonymous) return json({ ok: false, reason: "anonymous-user" });

  const body = await req.json().catch(() => ({}));

  const environment = paddleEnvironment();
  const apiKey = Deno.env.get("PADDLE_API_KEY") ?? "";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const base = environment === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";

  const deps: CheckoutDeps = {
    now: () => Date.now(),
    environment,
    hasApiKey: apiKey.length > 0,
    userAllowed: (id) => userAllowedFor(environment, parseUserAllowlist(Deno.env.get("SANDBOX_TEST_USER_IDS")), id),
    priceFor: (plan) => Deno.env.get(PRICE_ENV[plan]) || undefined,
    async getSubscription(userId) {
      const { data, error } = await admin
        .from("subscriptions")
        .select("plan, status, paddle_subscription_id, pending_plan, pending_plan_at, current_period_end")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(`abonelik okuma hatası: ${error.message}`);
      return (data as ExistingSub | null) ?? null;
    },
    async setPending(userId, plan, effectiveAt) {
      const { error } = await admin.from("subscriptions").update({ pending_plan: plan, pending_plan_at: effectiveAt }).eq("user_id", userId);
      if (error) throw new Error(`bekleyen düşürme yazılamadı: ${error.message}`);
    },
    async clearPending(userId) {
      const { error } = await admin.from("subscriptions").update({ pending_plan: null, pending_plan_at: null }).eq("user_id", userId);
      if (error) throw new Error(`bekleyen düşürme temizlenemedi: ${error.message}`);
    },
    locks: makeLockStore(admin),
    paddle: makePaddle(base, apiKey),
    log: { error: console.error, warn: console.warn },
  };

  const result = await handleCheckout(deps, user.id, body.plan);
  return json(result.body, result.status);
});
