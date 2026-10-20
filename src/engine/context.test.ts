import { describe, expect, it } from 'vitest'
import { bandOf, buildContext, conditionOf, dustLevelOf, sliceStay } from './context'
import { addHours, ammanNow, hoursBetween } from './time'
import { makeForecast } from './testing'

describe('time helpers', () => {
  it('adds hours across midnight and month ends', () => {
    expect(addHours('2026-10-31T22:00', 3)).toBe('2026-11-01T01:00')
    expect(hoursBetween('2026-10-20T10:00', '2026-10-21T10:00')).toBe(24)
  })

  it('gives the current hour in Amman (UTC+3)', () => {
    expect(ammanNow(new Date('2026-10-20T21:30:00Z'))).toBe('2026-10-21T00:00')
  })
})

describe('bands and conditions', () => {
  it('maps feels-like to bands', () => {
    expect(bandOf(-2)).toBe('freezing')
    expect(bandOf(8)).toBe('cold')
    expect(bandOf(15.9)).toBe('cool')
    expect(bandOf(20)).toBe('mild')
    expect(bandOf(27)).toBe('warm')
    expect(bandOf(33)).toBe('hot')
    expect(bandOf(40)).toBe('extreme')
  })

  it('maps WMO codes', () => {
    expect(conditionOf(0)).toBe('clear')
    expect(conditionOf(63)).toBe('rain')
    expect(conditionOf(73)).toBe('snow')
    expect(conditionOf(95)).toBe('thunder')
  })

  it('detects dust and sandstorms', () => {
    expect(dustLevelOf(null, null, 0)).toBeNull()
    expect(dustLevelOf(50, 20000, 20)).toBe('none')
    expect(dustLevelOf(150, 20000, 20)).toBe('moderate')
    expect(dustLevelOf(150, 1500, 50)).toBe('severe')
    expect(dustLevelOf(800, 20000, 10)).toBe('severe')
  })
})

describe('buildContext', () => {
  it('slices the stay from the start hour', () => {
    const f = makeForecast('2026-10-20T00:00', 48)
    const stay = sliceStay(f, '2026-10-20T10:00', 3)
    expect(stay.map((h) => h.time)).toEqual(['2026-10-20T10:00', '2026-10-20T11:00', '2026-10-20T12:00'])
  })

  it('returns null outside the forecast range', () => {
    const f = makeForecast('2026-10-20T00:00', 24)
    expect(buildContext(f, 'highland', '2026-10-25T10:00', 3)).toBeNull()
  })

  it('catches the Wadi Rum day/night swing', () => {
    // Warm afternoon, cold night
    const f = makeForecast('2026-10-20T00:00', 48, (_, h) => {
      const feels = h >= 10 && h <= 16 ? 30 : h >= 19 || h <= 5 ? 9 : 18
      return { feels, temp: feels }
    })
    const ctx = buildContext(f, 'desert', '2026-10-20T14:00', 10)!
    expect(ctx.feelsMax).toBe(30)
    expect(ctx.feelsMin).toBe(9)
    expect(ctx.swing).toBe(21)
    expect(ctx.coldBand).toBe('cold')
    expect(ctx.coolsAfterDark).toBe(true)
  })

  it('summarizes rain, wind, UV and the worst condition', () => {
    const f = makeForecast('2026-01-10T00:00', 24, (i) => ({
      precipProb: i === 9 ? 80 : 20,
      precip: i === 9 ? 2.5 : 0,
      code: i === 9 ? 63 : 3,
      wind: i === 10 ? 38 : 12,
      gust: i === 10 ? 60 : 20,
    }))
    const ctx = buildContext(f, 'highland', '2026-01-10T08:00', 4)!
    expect(ctx.rainProb).toBe(80)
    expect(ctx.precipMm).toBe(2.5)
    expect(ctx.condition).toBe('rain')
    expect(ctx.wind).toBe(38)
    expect(ctx.gust).toBe(60)
    expect(ctx.uvMax).toBe(5)
  })
})
