/** Outfits for real past days (ERA5 reanalysis): see scripts/build-fixtures.mjs. */
import { describe, expect, it } from 'vitest'
import fixtures from './fixtures/era5.json'
import { DATA, COLORS } from './catalog'
import { buildContext } from './context'
import { lightness } from './color'
import { generateOutfits } from './outfit'
import type { Forecast, HourPoint, OccasionId, Profile } from './types'
import { getPlace } from '@/features/places/places'

type Case = { id: string; place: string; date: string; start: string; hours: number; elevation: number; hoursData: HourPoint[] }
const CASES = (fixtures as unknown as { cases: Case[] }).cases

const PROFILES: Profile[] = [
  { gender: 'male', style: 'standard', skinTone: 2 },
  { gender: 'male', style: 'traditional', skinTone: 2 },
  { gender: 'female', style: 'standard', skinTone: 2 },
  { gender: 'female', style: 'modest', skinTone: 2 },
]
const occ = (id: OccasionId) => DATA.occasions.find((o) => o.id === id)!

function contextFor(c: Case) {
  const forecast: Forecast = { key: c.id, lat: 0, lon: 0, elevation: c.elevation, fetchedAt: 0, hours: c.hoursData, source: 'forecast' }
  return buildContext(forecast, getPlace(c.place)!.zone, `${c.date}T${c.start}`, c.hours)!
}
const byId = Object.fromEntries(CASES.map((c) => [c.id, c]))
const ids = (o: { pieces: { item: { id: string } }[] }) => o.pieces.map((p) => p.item.id)
const tags = (o: { pieces: { slot: string; item: { tags: string[] } }[] }, slot: string) => o.pieces.find((p) => p.slot === slot)?.item.tags ?? []

describe('real past weather', () => {
  it('every fixture gives complete outfits for every style and occasion', () => {
    for (const c of CASES) {
      const ctx = contextFor(c)
      for (const p of PROFILES)
        for (const o of DATA.occasions) {
          const outfits = generateOutfits(ctx, p, o, DATA)
          expect(outfits.length, `${c.id} ${p.style} ${o.id}`).toBeGreaterThan(0)
        }
    }
  })

  it('Amman snowstorm (Jan 2022): coat, boots, gloves for a workday', () => {
    const ctx = contextFor(byId['amman-snow-2022'])
    expect(ctx.feelsMin).toBeLessThanOrEqual(0)
    for (const p of PROFILES) {
      const [o] = generateOutfits(ctx, p, occ('work'), DATA)
      expect(o.pieces.find((x) => x.slot === 'outer'), p.style).toBeDefined()
      expect(tags(o, 'shoes').some((t) => ['boots', 'closed'].includes(t))).toBe(true)
      expect(ids(o)).toContain('gloves')
    }
  })

  it('Aqaba heatwave (Jul 2023): breathable fabrics, light colors, water and sun protection', () => {
    const ctx = contextFor(byId['aqaba-heat-2023'])
    expect(ctx.feelsMax).toBeGreaterThanOrEqual(38)
    for (const p of PROFILES) {
      const [o] = generateOutfits(ctx, p, occ('casual'), DATA)
      for (const piece of o.pieces.filter((x) => ['top', 'bottom'].includes(x.slot)))
        expect(['linen', 'cotton', 'chiffon', 'modal', 'tech'], `${p.style} ${piece.item.id}`).toContain(piece.fabric)
      const light = o.pieces.filter((x) => ['top', 'bottom'].includes(x.slot) && x.color).map((x) => lightness(COLORS.hex(x.color!)))
      expect(light.reduce((a, b) => a + b, 0) / light.length, p.style).toBeGreaterThan(0.65)
      expect(ids(o)).toEqual(expect.arrayContaining(['water-bottle', 'sunscreen']))
    }
  })

  it('Aqaba heatwave at the beach: swimwear for every style', () => {
    const ctx = contextFor(byId['aqaba-heat-2023'])
    for (const p of PROFILES) {
      const [o] = generateOutfits(ctx, p, occ('beach'), DATA)
      expect(o.pieces.some((x) => x.item.tags.includes('swim')), p.style).toBe(true)
    }
  })

  it('Wadi Rum December afternoon into the night: a warm layer for later', () => {
    const ctx = contextFor(byId['wadi-rum-dec-2022'])
    expect(ctx.swing).toBeGreaterThanOrEqual(5)
    for (const p of PROFILES) {
      const [o] = generateOutfits(ctx, p, occ('travel'), DATA)
      expect(o.pieces.find((x) => x.slot === 'outer'), p.style).toBeDefined()
    }
  })

  it('Amman summer workday: the office-AC layer to take along', () => {
    const ctx = contextFor(byId['amman-summer-2023'])
    for (const p of PROFILES) {
      const [o] = generateOutfits(ctx, p, occ('work'), DATA)
      const outer = o.pieces.find((x) => x.slot === 'outer')
      expect(outer?.carry, p.style).toBe(true)
    }
  })
})
