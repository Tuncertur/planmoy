// Planmoy — Hesap silme
//
// Supabase şemamızda businesses/tasks/notes/events/appointments gibi
// tablolar zaten "on delete cascade" ile auth.users(id)'ye bağlı — bu
// yüzden FireVibe'daki gibi tabloları tek tek silmemize gerek yok,
// sadece auth.users satırını silmek yeterli. Bunun için service_role
// yetkisi gerekiyor (client'tan yapılamaz), o yüzden Edge Function.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const deleteConfirmations = ["SİL", "DELETE"];

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, reason: "method-not-allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, reason: "no-auth" }), { status: 401 });
  }

  const { confirmation } = await req.json();
  if (!deleteConfirmations.includes(confirmation)) {
    return new Response(JSON.stringify({ ok: false, reason: "invalid-confirmation" }), { status: 400 });
  }

  // Kullanıcının kim olduğunu doğrulamak için kendi JWT'siyle bir client.
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ ok: false, reason: "invalid-session" }), { status: 401 });
  }

  // Silme işlemi için service_role client (Supabase Edge Functions'a otomatik sağlanır).
  const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ ok: false, reason: "delete-failed" }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
