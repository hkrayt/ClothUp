import placesData from '@/data/places.json'
import type { Lang, Place } from '@/engine/types'
import { normalizeSearch } from '@/lib/normalize'

export const PLACES = placesData as Place[]

const byId = new Map(PLACES.map((p) => [p.id, p]))

export function getPlace(id: string): Place | undefined {
  return byId.get(id)
}

const index = PLACES.map((p) => ({
  place: p,
  terms: [p.name.en, p.name.ar, ...p.aliases].map(normalizeSearch),
}))

/** Places matching the query, best matches first (prefix > word prefix > substring). */
export function searchPlaces(query: string, lang: Lang): Place[] {
  const q = normalizeSearch(query)
  const sorted = [...PLACES].sort((a, b) => a.name[lang].localeCompare(b.name[lang], lang))
  if (!q) return sorted

  const scored = index
    .map(({ place, terms }) => {
      let score = 0
      for (const t of terms) {
        if (t.startsWith(q)) score = Math.max(score, 3)
        else if (t.split(' ').some((w) => w.startsWith(q))) score = Math.max(score, 2)
        else if (t.includes(q)) score = Math.max(score, 1)
      }
      return { place, score }
    })
    .filter((s) => s.score > 0)

  return scored
    .sort((a, b) => b.score - a.score || a.place.name[lang].localeCompare(b.place.name[lang], lang))
    .map((s) => s.place)
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180
  const dLat = (bLat - aLat) * rad
  const dLon = (bLon - aLon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

export function nearestPlace(lat: number, lon: number): { place: Place; km: number } {
  let best = { place: PLACES[0], km: Infinity }
  for (const p of PLACES) {
    const km = distanceKm(lat, lon, p.lat, p.lon)
    if (km < best.km) best = { place: p, km }
  }
  return best
}

/** A Place for the device's location: real coordinates, named and zoned after the nearest known place. */
export function currentLocationPlace(lat: number, lon: number): Place {
  const { place } = nearestPlace(lat, lon)
  return {
    id: 'current',
    name: { en: `Near ${place.name.en}`, ar: `قرب ${place.name.ar}` },
    lat,
    lon,
    zone: place.zone,
    aliases: [],
  }
}
