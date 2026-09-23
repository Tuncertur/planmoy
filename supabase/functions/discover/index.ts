// Planmoy — Keşfet / Discover
//
// Pazartesi–Perşembe 50km, Cuma–Pazar 100km arama yarıçapı.
// Maliyeti düşürmek için: sonuçlar konum+kategori+HAFTA bazında
// paylaşımlı önbelleğe alınır (kullanıcıya özel değil — aynı bölgede
// arayan herkes aynı önbelleği paylaşır). Fotoğraflar da kalıcı olarak
// önbelleklenir. Her kullanıcının aylık maliyet tavanı kontrol edilir.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { checkAndChargeCost } from "../_shared/cost-cap.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CATEGORY_QUERIES: Record<string, string> = {
  restaurant: "restaurants",
  hotel: "hotels",
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
  const day = new Date().getDay();
  const isWeekend = day === 5 || day === 6 || day === 0;
  return isWeekend ? 100_000 : 50_000;
}

function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, reason: "method-not-allowed" }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, reason: "no-auth", places: [], groups: {} }), { status: 401, headers: corsHeaders });
  }
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, reason: "invalid-session", places: [], groups: {} }), { status: 401, headers: corsHeaders });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, reason: "missing-key", places: [], groups: {} }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { latitude, longitude, address, category, categories, languageCode } = await req.json();
  const radius = radiusForToday();
  const hasCoords = typeof latitude === "number" && typeof longitude === "number";
  const roundedLoc = hasCoords ? `${latitude.toFixed(2)},${longitude.toFixed(2)}` : (address ?? "").trim().toLocaleLowerCase("tr");

  async function getOrCachePhotos(placeId: string, googlePhotoNames: string[]): Promise<string[]> {
    try {
      const { data: cached } = await admin.from("place_photos_cache").select("photo_urls").eq("place_id", placeId).maybeSingle();
      if (cached?.photo_urls && Array.isArray(cached.photo_urls) && cached.photo_urls.length > 0) {
        return cached.photo_urls as string[];
      }
    } catch {
      return [];
    }
    if (!googlePhotoNames.length) return [];
    const urls: string[] = [];
    for (let i = 0; i < Math.min(3, googlePhotoNames.length); i++) {
      try {
        const mediaRes = await fetch(
          `https://places.googleapis.com/v1/${googlePhotoNames[i]}/media?maxWidthPx=600&key=${apiKey}`
        );
        if (!mediaRes.ok) continue;
        const bytes = new Uint8Array(await mediaRes.arrayBuffer());
        const path = `${placeId}/${i}.jpg`;
        await admin.storage.from("place-photos").upload(path, bytes, { contentType: "image/jpeg", upsert: true });
        const { data: pub } = admin.storage.from("place-photos").getPublicUrl(path);
        if (pub?.publicUrl) urls.push(pub.publicUrl);
      } catch {
        continue;
      }
    }
    if (urls.length > 0) {
      try {
        await admin.from("place_photos_cache").upsert({ place_id: placeId, photo_urls: urls, cached_at: new Date().toISOString() });
      } catch {
        // yoksay
      }
    }
    return urls;
  }

  async function fetchOne(cat: string) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - now.getUTCDay());
    const weekKey = weekStart.toISOString().slice(0, 10);
    const cacheKey = `${cat}:${roundedLoc}:${weekKey}`;

    try {
      const { data: cachedSearch } = await admin.from("places_search_cache").select("results").eq("cache_key", cacheKey).maybeSingle();
      if (cachedSearch?.results && Array.isArray(cachedSearch.results) && cachedSearch.results.length > 0) {
        return cachedSearch.results;
      }
    } catch {
      // önbellek yoksa devam et
    }

    const costCheck = await checkAndChargeCost(admin, user.id, 0.035);
    if (!costCheck.allowed) return [];

    const categoryQuery = CATEGORY_QUERIES[cat] ?? CATEGORY_QUERIES.places;
    const textQuery = hasCoords ? categoryQuery : `${categoryQuery} ${address ?? ""}`.trim();

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.nationalPhoneNumber,places.priceLevel,places.location,places.photos",
      },
      body: JSON.stringify({
        textQuery,
        languageCode: languageCode ?? "tr",
        maxResultCount: 6,
        rankPreference: hasCoords ? "DISTANCE" : "RELEVANCE",
        ...(hasCoords ? { locationBias: { circle: { center: { latitude, longitude }, radius } } } : {}),
      }),
    });

    if (!response.ok) return [];
    const payload = await response.json();
    const rawPlaces = payload.places ?? [];
    const mapped = await Promise.all(
      rawPlaces.map(async (p: any) => {
        const placeId = p.id ?? crypto.randomUUID();
        const googlePhotoNames = Array.isArray(p.photos) ? p.photos.slice(0, 3).map((photo: any) => photo.name) : [];
        const photos = await getOrCachePhotos(placeId, googlePhotoNames);
        return {
          id: placeId,
          name: p.displayName?.text ?? "Unnamed place",
          address: p.formattedAddress ?? "",
          phone: p.nationalPhoneNumber ?? null,
          priceLevel: typeof p.priceLevel === "string" ? p.priceLevel : null,
          rating: typeof p.rating === "number" ? p.rating : null,
          userRatingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
          distanceMeters:
            hasCoords && p.location?.latitude !== undefined && p.location?.longitude !== undefined
              ? distanceInMeters(latitude, longitude, p.location.latitude, p.location.longitude)
              : null,
          mapsUrl: p.googleMapsUri ?? null,
          websiteUrl: p.websiteUri ?? null,
          photos,
          category: cat,
        };
      })
    );
    const sorted = mapped.sort((a: any, b: any) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
    if (sorted.length > 0) {
      try {
        await admin.from("places_search_cache").upsert({ cache_key: cacheKey, results: sorted, cached_at: new Date().toISOString() });
      } catch {
        // yoksay
      }
    }
    return sorted;
  }

  if (Array.isArray(categories) && categories.length) {
    const groups: Record<string, unknown> = {};
    for (const cat of categories) {
      groups[cat] = await fetchOne(cat);
    }
    return new Response(JSON.stringify({ ok: true, radiusKm: radius / 1000, groups }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const places = await fetchOne(category ?? "places");
  return new Response(JSON.stringify({ ok: true, radiusKm: radius / 1000, places }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
