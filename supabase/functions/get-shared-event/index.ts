// Planmoy — Paylaşılan etkinliği token ile getir
//
// DÜZELTME: EventRsvpScreen daha önce doğrudan client'tan
// `supabase.from("events").select(...).eq("share_token", token)`
// çağırıyordu, ama events tablosunda herkese açık bir SELECT politikası
// hiç yoktu — yani anon/ziyaretçi kullanıcılar için bu sorgu RLS
// tarafından engelleniyordu (boş sonuç dönüyordu). Bu fonksiyon,
// service_role ile SADECE token'a uyan etkinliği ve katılımcı listesini
// döndürür; herkese açık bir RLS politikasına gerek kalmaz.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, reason: "method-not-allowed" }), { status: 405 });
  }
  let body: { token?: unknown } = {};
  try { body = await req.json(); } catch { /* geçersiz JSON */ }
  const token = typeof body?.token === "string" ? body.token : "";
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return new Response(JSON.stringify({ ok: false, reason: "no-token" }), { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: event, error } = await admin
    .from("events")
    .select("id, title, kind, description, location, starts_at, share_token")
    .eq("share_token", token)
    .maybeSingle();

  if (error || !event) {
    return new Response(JSON.stringify({ ok: false, reason: "not-found" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: participants } = await admin
    .from("event_participants")
    .select("display_name, status")
    .eq("event_id", event.id);

  return new Response(JSON.stringify({ ok: true, event, participants: participants ?? [] }), {
    headers: { "Content-Type": "application/json" },
  });
});
