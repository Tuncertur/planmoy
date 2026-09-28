import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { LocationSource } from "./useLocationSource";

// Oteller, Restoranlar ve Gezilecek Yerler ekranlarının ortak veri
// kaynağı. Kullanıcının isteğiyle: TEK sorguda üçü birden çekilir,
// ekran her açıldığında AYRI sorgu atılmaz. Yalnızca uygulama
// açıldığında veya yeni bir tatil planı oluşturulduğunda yenilenir.

export type TravelPlace = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  priceLevel: string | null;
  rating: number | null;
  userRatingCount: number | null;
  mapsUrl: string | null;
  websiteUrl: string | null;
  category: string;
};

type Groups = { hotel: TravelPlace[]; restaurant: TravelPlace[]; places: TravelPlace[] };
type CacheStatus = "idle" | "loading" | "missing-key" | "cap-reached" | "error" | "ready";

let memoryCache: { groups: Groups; at: number; capReached?: boolean; capReason?: "user" | "pool" } | null = null;
// Son çekilen KONUM anahtarı — konum (adres/GPS) değişince liste yeniden çekilir.
let lastLocationKey: string | null = null;

function locationKey(location: LocationSource): string {
  if (location.activeSource === "manual") return `m:${location.savedManualAddress.trim().toLocaleLowerCase("tr")}`;
  if (location.activeSource === "gps") return `g:${location.latitude?.toFixed(2)},${location.longitude?.toFixed(2)}`;
  return "none";
}
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export async function refreshTravelData(location: LocationSource) {
  if (location.activeSource === "none") return;
  const body =
    location.activeSource === "manual"
      ? { address: location.savedManualAddress, categories: ["hotel", "restaurant", "places"], languageCode: "tr" }
      : { latitude: location.latitude, longitude: location.longitude, categories: ["hotel", "restaurant", "places"], languageCode: "tr" };
  const { data, error } = await supabase.functions.invoke("discover", { body });
  if (error || !data?.ok) return { ok: false as const, reason: data?.reason ?? "provider-error" };
  memoryCache = { groups: data.groups, at: Date.now(), capReached: !!data.capReached, capReason: data.capReason };
  notify();
  return { ok: true as const, capReached: !!data.capReached, capReason: data.capReason };
}

/** Tatil planı oluşturulduğunda çağrılır — Oteller/Restoranlar/Gezilecek
 *  Yerler artık varış noktasına göre yenilenir (elle adres/GPS'ten bağımsız). */
export async function refreshTravelDataForAddress(address: string) {
  if (!address.trim()) return;
  const { data, error } = await supabase.functions.invoke("discover", {
    body: { address, categories: ["hotel", "restaurant", "places"], languageCode: "tr" },
  });
  if (error || !data?.ok) return { ok: false as const, reason: data?.reason ?? "provider-error" };
  memoryCache = { groups: data.groups, at: Date.now(), capReached: !!data.capReached, capReason: data.capReason };
  notify();
  return { ok: true as const, capReached: !!data.capReached, capReason: data.capReason };
}

export function useTravelData(category: keyof Groups, location: LocationSource) {
  const [, setTick] = useState(0);
  const [status, setStatus] = useState<CacheStatus>(memoryCache ? "ready" : "idle");

  const refresh = useCallback(async () => {
    setStatus("loading");
    lastLocationKey = locationKey(location);
    const result = await refreshTravelData(location);
    setStatus(
      result?.ok
        ? result.capReached && !Object.values(memoryCache?.groups ?? {}).some((g) => g.length > 0)
          ? "cap-reached"
          : "ready"
        : result?.reason === "missing-key"
        ? "missing-key"
        : "error"
    );
  }, [location.activeSource, location.savedManualAddress, location.latitude, location.longitude]);

  useEffect(() => {
    const listener = () => setTick((v) => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Konum (elle adres ya da GPS) değişince liste yeniden çekilir. Aynı anahtar için
  // birden fazla bileşen aynı anda tetiklemesin diye anahtar hemen işaretlenir.
  useEffect(() => {
    if (location.activeSource === "none") return;
    const key = locationKey(location);
    if (key !== lastLocationKey) refresh();
  }, [location.activeSource, location.savedManualAddress, location.latitude, location.longitude]);

  const capOnly = !!memoryCache?.capReached && !Object.values(memoryCache.groups).some((g) => g.length > 0);
  return { places: memoryCache?.groups[category] ?? [], status: capOnly ? "cap-reached" : memoryCache ? "ready" : status, capReason: memoryCache?.capReason, refresh };
}
