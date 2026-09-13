// supabase/functions/update-company-seats/index.ts
//
// İstemciden (kullanıcının kendi JWT'siyle) çağrılır. Kullanıcının aktif
// Firma aboneliğini bulur, Paddle Subscription Update API'sini çağırarak
// "ek koltuk" (company_extra_seat) satırının miktarını günceller.
//
// Gerekli secret: PADDLE_API_KEY (Paddle Dashboard > Developer Tools >
// Authentication > API keys — "Full access" izinli).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY")!;

const EXTRA_SEAT_PRICE_ID = "pri_01m201gk1ch31g2hvydrnczae1";
const SEATS_INCLUDED = 20;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    // Çağıranın kimliğini, KENDİ JWT'siyle doğrula (service role ile değil) —
    // böylece bir kullanıcı başka birinin aboneliğini güncelleyemez.
    const supabaseAsCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAsCaller.auth.getUser();
    if (userErr || !userData?.user) return new Response("Unauthorized", { status: 401 });
    const userId = userData.user.id;

    const { total_people } = await req.json();
    if (typeof total_people !== "number") {
      return new Response(JSON.stringify({ error: "total_people (sayı) gerekli" }), { status: 400 });
    }

    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("provider_subscription_id, tier, status")
      .eq("user_id", userId)
      .single();

    if (subErr || !sub || sub.tier !== "company" || sub.status !== "active" || !sub.provider_subscription_id) {
      return new Response(
        JSON.stringify({ error: "Aktif bir Firma aboneliği bulunamadı" }),
        { status: 400 },
      );
    }

    const extraSeats = Math.max(0, total_people - SEATS_INCLUDED);

    // Paddle Subscription Update API: mevcut ürün kalemlerini koruyarak
    // (proration_billing_mode ile bir sonraki fatura döneminde yansıtılır)
    // ek koltuk satırının miktarını günceller. extraSeats 0 ise satırı
    // tamamen kaldırır.
    const items = extraSeats > 0
      ? [{ price_id: EXTRA_SEAT_PRICE_ID, quantity: extraSeats }]
      : [];

    const paddleRes = await fetch(
      `https://api.paddle.com/subscriptions/${sub.provider_subscription_id}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
          proration_billing_mode: "prorated_next_billing_period",
        }),
      },
    );

    if (!paddleRes.ok) {
      const errText = await paddleRes.text();
      console.error("Paddle güncelleme hatası:", errText);
      return new Response(JSON.stringify({ error: "Paddle güncellemesi başarısız" }), { status: 502 });
    }

    return new Response(JSON.stringify({ updated: true, extraSeats }), { status: 200 });
  } catch (err) {
    console.error("update-company-seats hatası:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
