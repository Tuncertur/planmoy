// Planmoy — Sunucu tarafında Paddle işlemi (transaction) oluşturur.
//
// Neden: Paddle.js'e istemciden `customData` verilirse, kullanıcı tarayıcıda
// supabase_user_id'yi başkasının id'siyle değiştirebilir. Burada kullanıcı kimliği
// JWT'den DOĞRULANIR, fiyat ID'si sunucu ortam değişkenlerinden okunur ve
// custom_data sunucuda yazılır; istemci yalnızca `plan` adı gönderebilir ve
// dönen transactionId ile checkout'u açar. Webhook zaten bu custom_data'ya güvenir.
//
// Gerekli Supabase secrets (UYDURULMADI, yoksa fonksiyon "not-configured" döner):
//   PADDLE_API_KEY, PADDLE_ENVIRONMENT (sandbox|production),
//   PADDLE_PRICE_PERSONAL, PADDLE_PRICE_SOLO, PADDLE_PRICE_STUDIO

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PRICE_ENV: Record<string, string> = {
  personal: "PADDLE_PRICE_PERSONAL",
  solo: "PADDLE_PRICE_SOLO",
  studio: "PADDLE_PRICE_STUDIO",
};

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
  // Demo (anonim) hesapla satın alma: çıkışta hesap ve abonelik kaybolur.
  if (user.is_anonymous) return json({ ok: false, reason: "anonymous-user" }, 403);

  const body = await req.json().catch(() => ({}));
  const plan = typeof body.plan === "string" ? body.plan : "";
  const priceEnvName = PRICE_ENV[plan];
  if (!priceEnvName) return json({ ok: false, reason: "invalid-plan" }, 400);

  const apiKey = Deno.env.get("PADDLE_API_KEY");
  const priceId = Deno.env.get(priceEnvName);
  if (!apiKey || !priceId) return json({ ok: false, reason: "not-configured" });

  const base = Deno.env.get("PADDLE_ENVIRONMENT") === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
  const res = await fetch(`${base}/transactions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      custom_data: { supabase_user_id: user.id, tier: plan },
    }),
  });
  if (!res.ok) {
    console.error("Paddle transaction oluşturulamadı:", res.status, await res.text().catch(() => ""));
    return json({ ok: false, reason: "provider-error" });
  }
  const payload = await res.json();
  const transactionId: string | undefined = payload?.data?.id;
  if (!transactionId) return json({ ok: false, reason: "provider-error" });
  return json({ ok: true, transactionId });
});
