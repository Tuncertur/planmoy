// Planmoy — Keşfet / Discover
//
// Pazartesi–Perşembe 50km, Cuma–Pazar 100km arama yarıçapı.
// Maliyeti düşürmek için: sonuçlar konum+kategori+HAFTA bazında
// paylaşımlı önbelleğe alınır (kullanıcıya özel değil — aynı bölgede
// arayan herkes aynı önbelleği paylaşır). Fotoğraflar da kalıcı olarak
// önbelleklenir. Her kullanıcının aylık maliyet tavanı kontrol edilir.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { getPlan } from "../_shared/cost-cap.ts";
import { distanceInMeters, withUserDistance } from "../_shared/geo.ts";
import { idemKeyFor, projectCapFromEnv, reservePaidApi, settlePaidApi } from "../_shared/paid-api.ts";

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
  // Ücretsiz plan da canlı sonuç ve fotoğraf görür (kullanıcı kararı); maliyet kontrolü:
  // paylaşımlı arama/fotoğraf önbelleği + kullanıcı-başı tavan + ücretsiz havuz (cost-cap.ts).
  // Ücretsiz planda yer başına 1 fotoğraf, ücretli planda 3.
  const plan = await getPlan(admin, user.id);
  // Maliyet kararı: FREE için ücretli Google çağrısı YOK ($0). Free yalnızca daha önce önbelleklenmiş sonuçları görür.
  const paidAllowed = plan !== "free";
  const projectCapUsd = projectCapFromEnv(Deno.env.get("PROJECT_MONTHLY_CAP_USD"));
  const photosPerPlace = plan === "free" ? 1 : 3;
  const hasCoords = typeof latitude === "number" && typeof longitude === "number";
  const roundedLoc = hasCoords ? `${latitude.toFixed(2)},${longitude.toFixed(2)}` : (address ?? "").trim().toLocaleLowerCase("tr");

  async function getOrCachePhotos(placeId: string, googlePhotoNames: string[]): Promise<string[]> {
    try {
      const { data: cached } = await admin.from("place_photos_cache").select("photo_urls").eq("place_id", placeId).maybeSingle();
      if (cached?.photo_urls && Array.isArray(cached.photo_urls) && cached.photo_urls.length > 0) {
        return (cached.photo_urls as string[]).slice(0, photosPerPlace);
      }
    } catch {
      return [];
    }
    if (!googlePhotoNames.length) return [];
    // Fotoğraf indirme Google'a $0.007/adet ödetir — önce rezerve edilir, gerçekleşen adetle mutabık kalınır; tavan doluysa indirilmez.
    if (!paidAllowed) return [];
    const photoCount = Math.min(photosPerPlace, googlePhotoNames.length);
    const photoReserve = 0.007 * photoCount;
    const photoRes = await reservePaidApi(admin, {
      userId: user.id, surface: "discover-photos", amountUsd: photoReserve, plan, countsQuery: false,
      idemKey: idemKeyFor("discover-photos", null, placeId, Date.now(), 60_000), projectCapUsd,
    });
    if (!photoRes.allowed) return [];
    let fetchedPhotos = 0;
    const urls: string[] = [];
    for (let i = 0; i < photoCount; i++) {
      try {
        const mediaRes = await fetch(
          `https://places.googleapis.com/v1/${googlePhotoNames[i]}/media?maxWidthPx=600&key=${apiKey}`
        );
        if (!mediaRes.ok) continue;
        fetchedPhotos++;
        const bytes = new Uint8Array(await mediaRes.arrayBuffer());
        const path = `${placeId}/${i}.jpg`;
        await admin.storage.from("place-photos").upload(path, bytes, { contentType: "image/jpeg", upsert: true });
        const { data: pub } = admin.storage.from("place-photos").getPublicUrl(path);
        if (pub?.publicUrl) urls.push(pub.publicUrl);
      } catch {
        continue;
      }
    }
    await settlePaidApi(admin, photoRes.ledgerId, 0.007 * fetchedPhotos, fetchedPhotos > 0, photoReserve);
    if (urls.length > 0) {
      try {
        await admin.from("place_photos_cache").upsert({ place_id: placeId, photo_urls: urls, cached_at: new Date().toISOString() });
      } catch {
        // yoksay
      }
    }
    return urls;
  }

  let capReached = false;
  let capReason: string | undefined;

  async function fetchOne(cat: string) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - now.getUTCDay());
    const weekKey = weekStart.toISOString().slice(0, 10);
    const cacheKey = `${cat}:${roundedLoc}:${weekKey}`;

    try {
      const { data: cachedSearch } = await admin.from("places_search_cache").select("results").eq("cache_key", cacheKey).maybeSingle();
      if (cachedSearch?.results && Array.isArray(cachedSearch.results) && cachedSearch.results.length > 0) {
        return withUserDistance(cachedSearch.results as any[], hasCoords ? latitude : null, hasCoords ? longitude : null);
      }
    } catch {
      // önbellek yoksa devam et
    }

    if (!paidAllowed) {
      capReached = true;
      capReason = "free";
      return [];
    }
    // Text Search (Enterprise alan maskesi) ≈ $0.035/istek: rezerve et → çağır → gerçekleşenle mutabık kal / hatada iade et.
    const SEARCH_USD = 0.035;
    const searchRes = await reservePaidApi(admin, {
      userId: user.id, surface: "discover-search", amountUsd: SEARCH_USD, plan, countsQuery: false,
      idemKey: idemKeyFor("discover-search", null, cacheKey, Date.now(), 60_000), projectCapUsd,
    });
    if (!searchRes.allowed) {
      if (searchRes.reason === "duplicate-request") return []; // aynı arama zaten sürüyor: çift ücret yok, limit mesajı da yok
      capReached = true;
      capReason = searchRes.reason === "project-cap-reached" ? "pool" : "user";
      return [];
    }

    const categoryQuery = CATEGORY_QUERIES[cat] ?? CATEGORY_QUERIES.places;
    const textQuery = hasCoords ? categoryQuery : `${categoryQuery} ${address ?? ""}`.trim();

    let response: Response;
    try {
      response = await fetch("https://places.googleapis.com/v1/places:searchText", {
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
    } catch {
      await settlePaidApi(admin, searchRes.ledgerId, 0, false, SEARCH_USD); // ağ hatası: faturalanmadı → iade
      return [];
    }
    if (!response.ok) {
      await settlePaidApi(admin, searchRes.ledgerId, 0, false, SEARCH_USD); // sağlayıcı hatası: iade
      return [];
    }
    await settlePaidApi(admin, searchRes.ledgerId, SEARCH_USD, true, SEARCH_USD);
    const payload = await response.json();
    const rawPlaces = payload.places ?? [];
    const mapped = await Promise.all(
      rawPlaces.map(async (p: any) => {
        const placeId = p.id ?? crypto.randomUUID();
        const googlePhotoNames = Array.isArray(p.photos) ? p.photos.slice(0, photosPerPlace).map((photo: any) => photo.name) : [];
        const photos = await getOrCachePhotos(placeId, googlePhotoNames);
        return {
          id: placeId,
          name: p.displayName?.text ?? "Unnamed place",
          address: p.formattedAddress ?? "",
          phone: p.nationalPhoneNumber ?? null,
          priceLevel: typeof p.priceLevel === "string" ? p.priceLevel : null,
          rating: typeof p.rating === "number" ? p.rating : null,
          userRatingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
          lat: typeof p.location?.latitude === "number" ? p.location.latitude : null,
          lng: typeof p.location?.longitude === "number" ? p.location.longitude : null,
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
    return new Response(JSON.stringify({ ok: true, radiusKm: radius / 1000, groups, capReached, capReason }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const places = await fetchOne(category ?? "places");
  return new Response(JSON.stringify({ ok: true, radiusKm: radius / 1000, places, capReached, capReason }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
