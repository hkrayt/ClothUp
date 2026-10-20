import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { PLACES, currentLocationPlace, nearestPlace, searchPlaces } from './places'
import { normalizeSearch } from '@/lib/normalize'

const placeSchema = z.object({
  id: z.string().regex(/^[a-z-]+$/),
  name: z.object({ en: z.string().min(1), ar: z.string().min(1) }),
  lat: z.number().min(29).max(33.5),
  lon: z.number().min(34.8).max(39.4),
  elevation: z.number().min(-430).max(1900),
  zone: z.enum(['highland', 'northern-highland', 'highland-desert', 'steppe', 'desert', 'rift-valley', 'red-sea']),
  aliases: z.array(z.string()),
})

describe('places data', () => {
  it('is valid and inside Jordan', () => {
    for (const p of PLACES) placeSchema.parse(p)
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
  })

  it('returns every place for an empty query', () => {
    expect(searchPlaces('', 'en')).toHaveLength(PLACES.length)
  })
})

describe('nearest place', () => {
  it('snaps coordinates to the closest known place', () => {
    expect(nearestPlace(31.99, 35.87).place.id).toBe('amman')
    const here = currentLocationPlace(29.55, 35.0)
    expect(here.zone).toBe('red-sea')
    expect(here.name.en).toBe('Near Aqaba')
  })
})
