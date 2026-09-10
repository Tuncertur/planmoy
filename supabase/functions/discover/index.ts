// Planmoy — Keşfet / Discover
//
// FireVibe sürümünde "isWeekendWindow" değişkeni hesaplanıyordu ama HİÇBİR
// YERDE kullanılmıyordu — yarıçap her zaman sabit 30km'de kalıyordu. Burada
// bu kural gerçekten uygulanıyor: Pazartesi–Perşembe 50km, Cuma–Pazar 100km.
// (Kullanıcının kararı: 50/100km.)
//
// Google Places API anahtarı olmadan bu fonksiyon "missing-key" döner —
// FireVibe'daki dürüst davranış aynen korunuyor, uydurma veri üretilmez.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CATEGORY_QUERIES: Record<string, string> = {
  restaurant: "restaurants",
  cafe: "cafes coffee shops",
  bar: "bars pubs",
  cinema: "cinemas movie theaters",
  theater: "theaters performing arts venues",
  concert: "concert halls event venues live music",
  manicure: "manicure salons",
  pedicure: "pedicure salons",
  massage: "massage salons",
  sauna: "sauna",
  pool: "swimming pools",
  hammam: "Turkish baths hammam",
  haircut: "hair salons barbers stylists",
  places: "tourist attractions places to visit",
};

function radiusForToday(): number {
  const day = new Date().getDay(); // 0 = Pazar, 5 = Cuma, 6 = Cumartesi
  const isWeekend = day === 5 || day === 6 || day === 0;
  return isWeekend ? 100_000 : 50_000; // metre
}

function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, reason: "method-not-allowed" }), { status: 405 });
  }

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, reason: "missing-key", places: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { latitude, longitude, category, languageCode } = await req.json();
  const radius = radiusForToday();
  const query = CATEGORY_QUERIES[category] ?? CATEGORY_QUERIES.places;

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.location",
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: languageCode ?? "tr",
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      locationBias: { circle: { center: { latitude, longitude }, radius } },
    }),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ ok: false, reason: "provider-error", places: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await response.json();
  const places = (payload.places ?? [])
    .map((p: any) => ({
      id: p.id ?? crypto.randomUUID(),
      name: p.displayName?.text ?? "Unnamed place",
      address: p.formattedAddress ?? "",
      rating: typeof p.rating === "number" ? p.rating : null,
      userRatingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
      distanceMeters:
        p.location?.latitude !== undefined && p.location?.longitude !== undefined
          ? distanceInMeters(latitude, longitude, p.location.latitude, p.location.longitude)
          : null,
      mapsUrl: p.googleMapsUri ?? null,
      websiteUrl: p.websiteUri ?? null,
      category,
    }))
    .sort((a: any, b: any) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));

  return new Response(JSON.stringify({ ok: true, radiusKm: radius / 1000, places }), {
    headers: { "Content-Type": "application/json" },
  });
});
