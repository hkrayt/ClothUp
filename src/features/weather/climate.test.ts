import { describe, expect, it } from 'vitest'
import climate from '@/data/climate.json'
import { PLACES, getPlace } from '@/features/places/places'
import { typicalForecast } from './climate'

const data = climate as unknown as { source: string; places: Record<string, number[][]> }

describe('climate averages data', () => {
  it('covers every place with 12 sensible months', () => {
    for (const p of PLACES) {
      const months = data.places[p.id]
      expect(months, p.id).toBeDefined()
      expect(months).toHaveLength(12)
      for (const [tMax, tMin, fMax, fMin, rainShare, precip, wind, rh] of months) {
        expect(tMax, p.id).toBeGreaterThan(tMin)
        expect(fMax).toBeGreaterThan(fMin)
        expect(tMax).toBeLessThan(50)
        expect(tMin).toBeGreaterThan(-15)
        expect(rainShare).toBeGreaterThanOrEqual(0)
        expect(rainShare).toBeLessThanOrEqual(1)
        expect(precip).toBeGreaterThanOrEqual(0)
        expect(wind).toBeGreaterThan(0)
        expect(rh).toBeGreaterThan(0)
      }
    }
  })

  it('reflects Jordan’s climate: the Dead Sea is warmer than Amman, and summers are dry', () => {
    const jan = (id: string) => data.places[id][0][0]
    expect(jan('dead-sea')).toBeGreaterThan(jan('amman') + 5)
    expect(data.places.aqaba[6][0]).toBeGreaterThan(35)
    expect(data.places.amman[6][4]).toBeLessThan(0.05)
  })

  it('builds a typical forecast for a known place and for the current location', () => {
    expect(typicalForecast(getPlace('petra')!, '2027-03-10T09:00', 4)?.source).toBe('climate')
    const here = { ...getPlace('amman')!, id: 'current', lat: 31.95, lon: 35.94 }
    expect(typicalForecast(here, '2027-03-10T09:00', 4)).not.toBeNull()
  })
})
