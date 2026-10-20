import { describe, expect, it } from 'vitest'
import { climateForecast, diurnal, type ClimateData } from './climate'
import { buildContext } from './context'
import type { Place } from './types'

const place: Place = { id: 'x', name: { en: 'X', ar: 'س' }, lat: 31, lon: 35, elevation: 800, zone: 'highland', aliases: [] }
const month = (tMax: number, tMin: number, rain = 0.1) => [tMax, tMin, tMax - 1, tMin - 2, rain, 10, 20, 50] as never
const data: ClimateData = { source: 'test', places: { x: Array.from({ length: 12 }, (_, m) => (m === 0 ? month(12, 3, 0.4) : month(30, 18))) } }

describe('climate fallback', () => {
  it('peaks mid-afternoon and bottoms out before dawn', () => {
    expect(diurnal(5)).toBeCloseTo(0)
    expect(diurnal(14)).toBeCloseTo(1)
    expect(diurnal(20)).toBeGreaterThan(diurnal(3))
  })

  it('builds a typical day from monthly averages', () => {
    const f = climateForecast(place, 'x', data, '2027-01-15T10:00', 6)!
    expect(f.source).toBe('climate')
    const ctx = buildContext(f, 'highland', '2027-01-15T10:00', 6)!
    expect(ctx.source).toBe('climate')
    expect(ctx.lessCertain).toBe(true)
    expect(ctx.feelsMax).toBeLessThanOrEqual(11)
    expect(ctx.feelsMin).toBeGreaterThanOrEqual(1)
    expect(ctx.rainProb).toBe(40)
  })

  it('returns null for an unknown place', () => {
    expect(climateForecast(place, 'nope', data, '2027-01-15T10:00', 3)).toBeNull()
  })
})
