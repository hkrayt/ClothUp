import { describe, expect, it } from 'vitest'
import { buildContext } from './context'
import { uvLevel, weatherNotes } from './notes'
import { makeForecast } from './testing'

describe('weatherNotes', () => {
  it('warns about sandstorms first', () => {
    const f = makeForecast('2026-04-10T00:00', 24, () => ({ dust: 900, gust: 55, feels: 30 }))
    const keys = weatherNotes(buildContext(f, 'desert', '2026-04-10T10:00', 4)!).map((n) => n.key)
    expect(keys[0]).toBe('sandstorm')
    expect(keys).toContain('gusts')
  })

  it('flags humid heat at the Dead Sea', () => {
    const f = makeForecast('2026-07-10T00:00', 24, () => ({ feels: 39, humidity: 60, uv: 9 }))
    const keys = weatherNotes(buildContext(f, 'rift-valley', '2026-07-10T11:00', 3)!).map((n) => n.key)
    expect(keys).toEqual(['humid', 'uv', 'extremeHeat'])
  })

  it('says nothing on a calm mild day', () => {
    const f = makeForecast('2026-05-10T00:00', 24)
    expect(weatherNotes(buildContext(f, 'highland', '2026-05-10T10:00', 3)!)).toEqual([])
  })

  it('grades UV', () => {
    expect(uvLevel(1)).toBe('low')
    expect(uvLevel(6.5)).toBe('high')
    expect(uvLevel(11)).toBe('extreme')
  })
})
