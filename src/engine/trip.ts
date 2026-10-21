/**
 * Multi-day trips: one outfit per day, chosen so pieces are reused where that makes sense,
 * and a packing list built from all of them.
 */
import type { EngineData } from './catalog'
import type { Outfit, OutfitPiece, Slot } from './outfit-types'
import type { Occasion, OccasionId, Profile, WeatherContext } from './types'
import { generateOutfits, type GenerateOptions } from './outfit'
import { addHours, ammanNow, atHour, dateOf, hourOf } from './time'

/** Daytime window planned for each day (08:00–22:00). */
export const DAY_START_HOUR = 8
export const DAY_HOURS = 14
export const TRIP_DAYS = [2, 3, 4, 5, 7, 10] as const

/** Slots that are worn again on later days of a trip; the rest (tops, socks) are packed per day. */
const REUSABLE: Slot[] = ['outer', 'mid', 'bottom', 'shoes', 'head', 'eyewear', 'accessory']
const PER_DAY: Slot[] = ['top', 'socks']

export interface TripDayPlan {
  date: string
  occasion: OccasionId
  /** Null when there's no weather for that day. */
  ctx: WeatherContext | null
}

export interface TripDay extends TripDayPlan {
  outfit: Outfit | null
}

export interface PackItem {
  /** Item id plus color, so a navy and a black jumper are separate lines. */
  key: string
  piece: OutfitPiece
  count: number
  /** Dates it's worn on. */
  dates: string[]
}

/** The dates of a trip, from its first day. */
export function tripDates(startDate: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => dateOf(addHours(atHour(startDate, 12), 24 * i)))
}

/** Start time and length of the planned daytime window; today starts from now. */
export function dayWindow(date: string, now = ammanNow()): { start: string; hours: number } {
  const start = atHour(date, DAY_START_HOUR)
  if (dateOf(now) !== date || now <= start) return { start, hours: DAY_HOURS }
  const left = DAY_START_HOUR + DAY_HOURS - hourOf(now)
  return { start: now, hours: Math.max(3, left) }
}

/** First and last days are travel days when asked; the rest use the trip's occasion. */
export function dayOccasions(days: number, occasion: OccasionId, travelDays: boolean): OccasionId[] {
  return Array.from({ length: days }, (_, i) => (travelDays && days > 1 && (i === 0 || i === days - 1) ? 'travel' : occasion))
}

/**
 * Plans an outfit for each day. Pieces already packed for an earlier day get a bonus in the
 * reusable slots (and the same palette is kept), so the suitcase stays small; tops get a small
 * penalty so they change from day to day.
 */
export function planTrip(
  days: TripDayPlan[],
  profile: Profile,
  occasions: (id: OccasionId) => Occasion,
  data: EngineData,
  opts: Pick<GenerateOptions, 'prefs' | 'owned'> = {},
): TripDay[] {
  const packed = new Map<string, Slot>()
  let paletteId: string | undefined
  return days.map((day) => {
    if (!day.ctx) return { ...day, outfit: null }
    const prefs: Record<string, number> = { ...opts.prefs }
    for (const [id, slot] of packed) prefs[id] = (prefs[id] ?? 0) + (REUSABLE.includes(slot) ? 2 : PER_DAY.includes(slot) ? -1 : 0)
    const occasion = occasions(day.occasion)
    // Keep the first day's palette, so pieces worn again match the new ones.
    const outfit = generateOutfits(day.ctx, profile, occasion, data, { ...opts, prefs, count: 1, paletteId })[0] ?? null
    if (outfit) {
      paletteId ??= outfit.palette?.id
      for (const p of outfit.pieces) packed.set(p.item.id, p.slot)
    }
    return { ...day, outfit }
  })
}

/** Everything to pack, head to toe; tops and socks count one per day worn, the rest once. */
export function packingList(days: TripDay[], slotOrder: Slot[]): PackItem[] {
  const items = new Map<string, PackItem>()
  for (const day of days) {
    for (const piece of day.outfit?.pieces ?? []) {
      const key = `${piece.item.id}:${piece.color ?? ''}`
      const entry = items.get(key) ?? { key, piece, count: 0, dates: [] }
      if (!entry.dates.includes(day.date)) entry.dates.push(day.date)
      entry.count = PER_DAY.includes(piece.slot) ? entry.dates.length : 1
      items.set(key, entry)
    }
  }
  return [...items.values()].sort((a, b) => slotOrder.indexOf(a.piece.slot) - slotOrder.indexOf(b.piece.slot) || a.key.localeCompare(b.key))
}
