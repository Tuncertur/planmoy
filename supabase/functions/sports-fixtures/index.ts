// Planmoy — Gerçek spor müsabakaları
//
// TheSportsDB'nin herkese açık, anahtarsız test uç noktasını kullanır
// (resmi olarak paylaşılan "3" test anahtarı — kayıt gerekmez).
// NOT (dürüstçe belirtiliyor): bu ücretsiz katman ülkeye göre filtreleme
// desteklemiyor, sadece branşa göre günün maçlarını döndürüyor.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SPORT_MAP: Record<string, string> = {
  football: "Soccer",
  basketball: "Basketball",
  tennis: "Tennis",
  volleyball: "Volleyball",
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, reason: "method-not-allowed" }), { status: 405 });
  }

  const { sport, date } = await req.json();
  const sportName = SPORT_MAP[sport] ?? "Soccer";
  const day = date ?? new Date().toISOString().slice(0, 10);

  const response = await fetch(
    `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${day}&s=${encodeURIComponent(sportName)}`
  );

  if (!response.ok) {
    return new Response(JSON.stringify({ ok: false, reason: "provider-error", events: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await response.json();
  const events = (payload.events ?? []).slice(0, 30).map((e: any) => ({
    id: e.idEvent,
    league: e.strLeague,
    home: e.strHomeTeam,
    away: e.strAwayTeam,
    time: e.strTime,
    date: e.dateEvent,
    venue: e.strVenue,
  }));

  return new Response(JSON.stringify({ ok: true, events }), {
    headers: { "Content-Type": "application/json" },
  });
});
