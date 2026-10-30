// Planmoy — mekân mesafesi (saf; Node/Deno). Önbellek, İLK arayan kullanıcının mesafesini saklamamalı: mesafe her istekte
// o isteğin kendi konumundan yeniden hesaplanır.
export function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadius = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export type PlaceLike = { lat?: unknown; lng?: unknown; distanceMeters?: unknown; [k: string]: unknown };

/** Kullanıcının GERÇEK sorgu konumuna göre mesafeyi yeniden hesaplar ve yakından uzağa sıralar.
 *  Konum yoksa ya da kayıtta koordinat yoksa mesafe null olur (başka birinin mesafesi ASLA gösterilmez). */
export function withUserDistance<T extends PlaceLike>(list: T[], userLat: number | null, userLng: number | null): (T & { distanceMeters: number | null })[] {
  const out = list.map((p) => ({
    ...p,
    distanceMeters:
      userLat !== null && userLng !== null && typeof p.lat === "number" && typeof p.lng === "number"
        ? distanceInMeters(userLat, userLng, p.lat, p.lng)
        : null,
  }));
  return out.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
}
