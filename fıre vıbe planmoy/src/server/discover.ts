import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { enforceRateLimit, requestClientKey } from './rate-limit'

const discoverInput = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  category: z.enum(['restaurant', 'manicure', 'pedicure', 'massage', 'sauna', 'pool', 'hammam', 'haircut', 'places']),
  languageCode: z.enum(['tr', 'en', 'de', 'fr', 'es', 'ar', 'ru', 'zh']).default('tr'),
})

export type NearbyPlace = {
  id: string
  name: string
  address: string
  rating: number | null
  userRatingCount: number | null
  distanceMeters: number | null
  mapsUrl: string | null
  websiteUrl: string | null
  photoUrl: string | null
  category: string
}

const searchQueries: Record<z.infer<typeof discoverInput>['category'], string> = {
  restaurant: 'restaurants',
  manicure: 'manicure salons',
  pedicure: 'pedicure salons',
  massage: 'massage salons',
  sauna: 'sauna',
  pool: 'swimming pools',
  hammam: 'Turkish baths hammam',
  haircut: 'hair salons barbers stylists',
  places: 'tourist attractions places to visit',
}

/** Server-only Google Places boundary. It returns no fabricated fallback data when the connector is absent. */
export const getNearbyPlaces = createServerFn({ method: 'POST' }).validator(discoverInput).handler(async ({ data }) => {
  enforceRateLimit(`discover:${requestClientKey()}`, 20, 60_000)
  const apiKey = process.env['GOOGLE_MAPS_API_KEY']
  if (!apiKey) return { ok: false as const, reason: 'missing-key' as const, places: [] }

  const now = new Date()
  const day = now.getDay()
  const isWeekendWindow = day === 5 || day === 6 || day === 0
  const radius = 30000
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.location,places.photos',
    },
    body: JSON.stringify({
      textQuery: searchQueries[data.category],
      languageCode: data.languageCode,
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
      locationBias: { circle: { center: { latitude: data.latitude, longitude: data.longitude }, radius } },
    }),
  })
  if (!response.ok) return { ok: false as const, reason: 'provider-error' as const, places: [] }

  const payload = await response.json() as { places?: Array<{ id?: string; displayName?: { text?: string }; formattedAddress?: string; rating?: number; userRatingCount?: number; googleMapsUri?: string; websiteUri?: string; photos?: Array<{ name?: string }>; location?: { latitude?: number; longitude?: number } }> }
  const places: NearbyPlace[] = await Promise.all((payload.places ?? []).map(async place => ({
    id: place.id ?? crypto.randomUUID(),
    name: place.displayName?.text ?? 'Unnamed place',
    address: place.formattedAddress ?? '',
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    distanceMeters: place.location?.latitude !== undefined && place.location?.longitude !== undefined ? distanceInMeters(data.latitude, data.longitude, place.location.latitude, place.location.longitude) : null,
    mapsUrl: place.googleMapsUri ?? null,
    websiteUrl: place.websiteUri ?? null,
    photoUrl: await fetchPlacePhoto(place.photos?.[0]?.name, apiKey),
    category: data.category,
  }))).then(items => items.sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER)))
  return { ok: true as const, radiusKm: radius / 1000, places }
})

async function fetchPlacePhoto(photoName: string | undefined, apiKey: string) {
  if (!photoName) return null
  try {
    const response = await fetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${encodeURIComponent(apiKey)}`, { redirect: 'follow' })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') ?? 'image/jpeg'
    const bytes = new Uint8Array(await response.arrayBuffer())
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return `data:${contentType};base64,${btoa(binary)}`
  } catch {
    return null
  }
}

function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6371000
  const toRadians = (value: number) => value * Math.PI / 180
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}
