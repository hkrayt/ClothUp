import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { GOVERNORATES, PLACES, currentLocationPlace, groupByGovernorate, nearestPlace, searchPlaces } from './places'
import type { Governorate } from '@/engine/types'
import { normalizeSearch } from '@/lib/normalize'

const placeSchema = z.object({
  id: z.string().regex(/^[a-z-]+$/),
  name: z.object({ en: z.string().min(1), ar: z.string().min(1) }),
  lat: z.number().min(29).max(33.5),
  lon: z.number().min(34.8).max(39.4),
  elevation: z.number().min(-430).max(1900),
  zone: z.enum(['highland', 'northern-highland', 'highland-desert', 'steppe', 'desert', 'rift-valley', 'red-sea']),
  type: z.enum(['city', 'town', 'neighbourhood', 'tourist', 'campus', 'transport']),
  governorate: z.enum(GOVERNORATES as [Governorate, ...Governorate[]]),
  aliases: z.array(z.string()),
})

describe('places data', () => {
  it('is valid and inside Jordan', () => {
    for (const p of PLACES) placeSchema.parse(p)
  })

  it('has every governorate centre and no two places on the same spot', () => {
    expect(PLACES.length).toBeGreaterThanOrEqual(60)
    for (const g of GOVERNORATES) expect(PLACES.some((p) => p.governorate === g), g).toBe(true)
    for (let i = 0; i < PLACES.length; i++)
      for (let j = i + 1; j < PLACES.length; j++) {
        const a = PLACES[i]
        const b = PLACES[j]
        expect(Math.hypot(a.lat - b.lat, a.lon - b.lon) > 0.004, `${a.id} vs ${b.id}`).toBe(true)
      }
  })

  it('groups places by governorate with the governorate centre first', () => {
    const groups = groupByGovernorate(PLACES, 'en')
    expect(groups[0].governorate).toBe('amman')
    expect(groups.find((g) => g.governorate === 'aqaba')!.places[0].id).toBe('aqaba')
  })

  it('has unique ids and covers the required locations', () => {
    const ids = PLACES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ['amman', 'zarqa', 'irbid', 'aqaba', 'dead-sea', 'petra', 'wadi-rum', 'ajloun', 'jerash', 'madaba', 'karak', 'mafraq', 'maan', 'tafilah', 'salt']) {
      expect(ids).toContain(id)
    }
  })
})

describe('search', () => {
  it('normalizes Arabic letter variants and the definite article', () => {
    expect(normalizeSearch('إربد')).toBe(normalizeSearch('اربد'))
    expect(normalizeSearch('العقبة')).toBe('عقبه')
  })

  it('finds places in English, Arabic and by alias', () => {
    expect(searchPlaces('aqa', 'en')[0].id).toBe('aqaba')
    expect(searchPlaces('عقبه', 'ar')[0].id).toBe('aqaba')
    expect(searchPlaces('البترا', 'ar')[0].id).toBe('petra')
    expect(searchPlaces('sweimeh', 'en')[0].id).toBe('dead-sea')
    expect(searchPlaces("ma'an", 'en')[0].id).toBe('maan')
    expect(searchPlaces('البتراء', 'ar')[0].id).toBe('petra')
    expect(searchPlaces('mujib', 'en')[0].id).toBe('wadi-mujib')
    expect(searchPlaces('UJ', 'en')[0].id).toBe('uni-jordan')
    expect(searchPlaces('airport', 'en')[0].id).toBe('qaia')
    expect(searchPlaces('عبدون', 'ar')[0].id).toBe('abdoun')
  })

  it('returns every place for an empty query', () => {
    expect(searchPlaces('', 'en')).toHaveLength(PLACES.length)
  })
})

describe('nearest place', () => {
  it('snaps coordinates to the closest known place', () => {
    expect(nearestPlace(31.955, 35.945).place.id).toBe('amman')
    // West Amman is ~250 m higher than downtown, so it snaps to its own neighbourhood
    expect(nearestPlace(32.0, 35.856).place.id).toBe('tla-al-ali')
    const here = currentLocationPlace(29.55, 35.0)
    expect(here.zone).toBe('red-sea')
    expect(here.name.en).toBe('Near Aqaba')
  })
})
