// supabase/functions/send-push/index.ts
//
// Verilen bir kullanıcıya (user_id) gerçek push bildirimi (Firebase Cloud
// Messaging üzerinden) gönderir. split_requests tablosuna yeni bir satır
// eklendiğinde veritabanı tetikleyicisi (notify_split_request) bunu
// otomatik çağırır — ama başka amaçlarla da (ör. ödeme hatırlatması)
// doğrudan çağrılabilir.
//
// Gerekli secret: FCM_SERVICE_ACCOUNT_JSON — Firebase Console > Project
// settings > Service accounts > Generate new private key ile indirdiğiniz
// JSON dosyasının TAM içeriği (tek satır, tırnaklar dahil).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { create as createJwt } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON")!;
// Veritabanı tetikleyicisinin (notify_split_request) bu fonksiyonu
// çağırabilmesi için, tam yetkili service_role anahtarı yerine SADECE bu
// amaç için sınırlı bir "iç anahtar". SQL'e gömülü olduğu için sızma
// riskini azaltmak amacıyla ayrı tutulur.
const INTERNAL_TRIGGER_SECRET = Deno.env.get("INTERNAL_TRIGGER_SECRET")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function pemToCryptoKey(pem: string): Promise<CryptoKey> {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function getFcmAccessToken(): Promise<
  { accessToken: string; projectId: string }
> {
  const sa = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
  const key = await pemToCryptoKey(sa.private_key);
  const now = Math.floor(Date.now() / 1000);
  const jwt = await createJwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    key,
  );

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error("FCM token exchange failed: " + JSON.stringify(tokenJson));
  }
  return { accessToken: tokenJson.access_token, projectId: sa.project_id };
}

serve(async (req) => {
  try {
    // GÜVENLİK: Bu fonksiyon iki şekilde çağrılabilir —
    // 1) Bizim veritabanı tetikleyicimiz (service role anahtarıyla, "Bearer <service_role_key>")
    // 2) Giriş yapmış bir kullanıcının KENDİSİNE test bildirimi göndermesi (kendi JWT'siyle,
    //    ve sadece kendi user_id'sine).
    // Bu kontrol olmadan HERKES herhangi bir kullanıcıya sahte bildirim gönderebilirdi.
    const authHeader = req.headers.get("Authorization") || "";
    const providedKey = authHeader.replace("Bearer ", "");
    const { user_id, title, body } = await req.json();
    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "user_id, title, body gerekli" }), { status: 400 });
    }

    const isTrustedServer = providedKey === SUPABASE_SERVICE_ROLE_KEY || providedKey === INTERNAL_TRIGGER_SECRET;
    if (!isTrustedServer) {
      const supabaseAsCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: callerData, error: callerErr } = await supabaseAsCaller.auth.getUser();
      if (callerErr || !callerData?.user || callerData.user.id !== user_id) {
        return new Response(JSON.stringify({ error: "Yetkisiz: sadece kendinize test bildirimi gönderebilirsiniz." }), { status: 403 });
      }
    }

    const { data: tokens } = await supabaseAdmin
      .from("push_tokens")
      .select("token")
      .eq("user_id", user_id);

    if (!tokens || !tokens.length) {
      // Kullanıcının kayıtlı cihazı yok — sessizce başarılı say (uygulama
      // içi bildirim zaten Profil ekranında görünüyor, bu ek bir kanal).
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const { accessToken, projectId } = await getFcmAccessToken();
    let sent = 0;
    for (const t of tokens) {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: t.token,
              notification: { title, body },
            },
          }),
        },
      );
      if (res.ok) sent++;
      else console.error("FCM gönderim hatası:", await res.text());
    }

    return new Response(JSON.stringify({ sent }), { status: 200 });
  } catch (err) {
    console.error("send-push hatası:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
