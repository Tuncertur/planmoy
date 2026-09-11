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
  rating: number | null;
  userRatingCount: number | null;
  mapsUrl: string | null;
  websiteUrl: string | null;
  category: string;
};

type Groups = { hotel: TravelPlace[]; restaurant: TravelPlace[]; places: TravelPlace[] };
type CacheStatus = "idle" | "loading" | "missing-key" | "error" | "ready";

let memoryCache: { groups: Groups; at: number } | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export async function refreshTravelData(location: LocationSource) {
  if (location.activeSource === "none") return;
  const body =
    location.activeSource === "manual"
      ? { address: location.manualAddress, categories: ["hotel", "restaurant", "places"], languageCode: "tr" }
      : { latitude: location.latitude, longitude: location.longitude, categories: ["hotel", "restaurant", "places"], languageCode: "tr" };
  const { data, error } = await supabase.functions.invoke("discover", { body });
  if (error || !data?.ok) return { ok: false as const, reason: data?.reason ?? "provider-error" };
  memoryCache = { groups: data.groups, at: Date.now() };
  notify();
  return { ok: true as const };
}

/** Tatil planı oluşturulduğunda çağrılır — Oteller/Restoranlar/Gezilecek
 *  Yerler artık varış noktasına göre yenilenir (elle adres/GPS'ten bağımsız). */
export async function refreshTravelDataForAddress(address: string) {
  if (!address.trim()) return;
  const { data, error } = await supabase.functions.invoke("discover", {
    body: { address, categories: ["hotel", "restaurant", "places"], languageCode: "tr" },
  });
  if (error || !data?.ok) return { ok: false as const, reason: data?.reason ?? "provider-error" };
  memoryCache = { groups: data.groups, at: Date.now() };
  notify();
  return { ok: true as const };
}

export function useTravelData(category: keyof Groups, location: LocationSource) {
  const [, setTick] = useState(0);
  const [status, setStatus] = useState<CacheStatus>(memoryCache ? "ready" : "idle");

  const refresh = useCallback(async () => {
    setStatus("loading");
    const result = await refreshTravelData(location);
    setStatus(result?.ok ? "ready" : result?.reason === "missing-key" ? "missing-key" : "error");
  }, [location.activeSource, location.manualAddress, location.latitude, location.longitude]);

  useEffect(() => {
    const listener = () => setTick((v) => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!memoryCache && location.activeSource !== "none") refresh();
  }, [location.activeSource]);

  return { places: memoryCache?.groups[category] ?? [], status: memoryCache ? "ready" : status, refresh };
}
