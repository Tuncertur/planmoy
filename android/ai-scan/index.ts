// supabase/functions/ai-scan/index.ts
//
// İstemciden (web/Android/iOS) fiş fotoğrafını alır, kullanıcının hakkı
// olup olmadığını sunucu tarafında kontrol eder, sonra Google Gemini'ye
// gönderip fiş bilgilerini (tutar, mağaza, tarih, kategori önerisi) JSON
// olarak döner. Gemini API anahtarı SADECE burada, sunucuda durur —
// istemci koduna asla konulmaz.
//
// İstemciden çağrı örneği (app.js içine eklenecek):
//   const { data: { session } } = await supabaseClient.auth.getSession();
//   const res = await fetch(
//     `${SUPABASE_URL}/functions/v1/ai-scan`,
//     {
//       method: "POST",
//       headers: {
//         "Authorization": `Bearer ${session.access_token}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ image_base64: "..." }),
//     }
//   );

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const GEMINI_MODEL = "gemini-2.5-flash-lite";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  const supabaseAsUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userError } = await supabaseAsUser.auth
    .getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Giriş gerekli" }), {
      status: 401,
    });
  }
  const userId = userData.user.id;

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", userId)
    .single();

  const hasAiScanEntitlement = sub &&
    ["ai_scan", "family", "company"].includes(sub.tier) &&
    sub.status === "active";
  const effectiveTier = hasAiScanEntitlement ? sub.tier : "free";

  // GÜVENLİK: Ödemeli kullanıcılar için de (hesap ele geçirilirse sınırsız
  // Gemini API maliyeti oluşmasın diye) makul bir saatlik üst tavan (60
  // tarama) uygulanır — bu, aşağıdaki AYLIK tarife limitinden BAĞIMSIZ,
  // ek bir hız freni. Normal kullanım için fazlasıyla yeterli.
  if (hasAiScanEntitlement) {
    const { data: rateOk } = await supabaseAdmin.rpc("check_rate_limit", {
      p_action: "ai_scan_paid",
      p_max_per_hour: 60,
      p_user_id: userId,
    });
    if (rateOk === false) {
      return new Response(
        JSON.stringify({ error: "Saatlik tarama sınırına ulaşıldı, lütfen daha sonra tekrar deneyin.", code: "RATE_LIMITED" }),
        { status: 429 },
      );
    }
  }

  // TARİFEYE GÖRE AYLIK LİMİT (ve deneme kullanıcılar için ömür boyu 100
  // hakkı) — tek bir atomic veritabanı fonksiyonuyla kontrol edilir ve
  // aynı anda sayaç artırılır (increment_function.sql / tier_scan_limits.sql).
  const { data: allowed, error: usageErr } = await supabaseAdmin.rpc(
    "check_and_increment_scan_usage",
    { p_user_id: userId, p_tier: effectiveTier },
  );
  if (usageErr) {
    console.error("Kullanım kontrolü hatası:", usageErr);
    return new Response(JSON.stringify({ error: "Kullanım kontrolü başarısız" }), { status: 500 });
  }
  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: hasAiScanEntitlement
          ? "Bu ayki tarama hakkınız bitti, bir sonraki fatura döneminde yenilenecek."
          : "Deneme tarama hakkınız bitti. Lütfen abone olun.",
        code: hasAiScanEntitlement ? "MONTHLY_LIMIT_REACHED" : "TRIAL_LIMIT_REACHED",
      }),
      { status: 403 },
    );
  }

  const { image_base64 } = await req.json();
  if (!image_base64) {
    return new Response(JSON.stringify({ error: "image_base64 gerekli" }), {
      status: 400,
    });
  }

  let extracted;
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Bu fiş/fatura görselindeki HER BİR ürünü/kalemi ayrı " +
                    "satır olarak çıkar. Her kalem için: ad (kısa ürün adı), " +
                    "tutar (o kalemin fiyatı, sayı), kdv (o kalemin KDV " +
                    "oranı, sayı, emin değilsen 18). Ayrıca fişin geneli " +
                    "için: magaza (satıcı adı), tarih (YYYY-MM-DD). " +
                    "Kalemleri okuyamıyorsan (ör. sadece toplam görünüyorsa) " +
                    "tek bir kalem olarak 'Genel' adıyla toplam tutarı yaz. " +
                    "Emin olmadığın alanları null bırak.",
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: image_base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                magaza: { type: "string", nullable: true },
                tarih: { type: "string", nullable: true },
                kalemler: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      ad: { type: "string" },
                      tutar: { type: "number" },
                      kdv: { type: "number", nullable: true },
                    },
                  },
                },
              },
            },
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini hatası:", errText);
      return new Response(
        JSON.stringify({ error: "AI servisi şu an yanıt vermedi" }),
        { status: 502 },
      );
    }

    const geminiJson = await geminiRes.json();
    const textPart = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    extracted = JSON.parse(textPart);
    // Toplam tutarı sunucu tarafında kalemlerden hesapla — AI'nın kendi
    // topladığı bir "toplam" alanına güvenmek yerine, tutarsızlığı önler.
    extracted.toplam_tutar = (extracted.kalemler || []).reduce(
      (s, k) => s + (Number(k.tutar) || 0),
      0,
    );
  } catch (err) {
    console.error("AI çağrı hatası:", err);
    return new Response(JSON.stringify({ error: "İşlem başarısız" }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ result: extracted }), { status: 200 });
});
