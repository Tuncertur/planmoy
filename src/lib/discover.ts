import { supabase } from "./supabase";

export type NearbyPlace = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  userRatingCount: number | null;
  distanceMeters: number | null;
  mapsUrl: string | null;
  websiteUrl: string | null;
  category: string;
};

export type DiscoverResult =
  | { ok: true; radiusKm: number; places: NearbyPlace[] }
  | { ok: false; reason: "missing-key" | "provider-error" | "method-not-allowed"; places: [] };

export async function getNearbyPlaces(params: {
  latitude: number;
  longitude: number;
  category: string;
  languageCode?: string;
}): Promise<DiscoverResult> {
  const { data, error } = await supabase.functions.invoke("discover", { body: params });
  if (error) return { ok: false, reason: "provider-error", places: [] };
  return data as DiscoverResult;
}

/** FireVibe'da hesaplanıp hiç kullanılmayan kural — burada gerçekten uygulanıyor:
 *  Pazartesi–Perşembe 50km, Cuma–Pazar 100km. */
export function isWeekendWindow(): boolean {
  const day = new Date().getDay();
  return day === 5 || day === 6 || day === 0;
}
