import { describe, expect, it } from 'vitest'
import { DATA } from './catalog'
import { SCENARIOS } from './scenarios'
import { dayOccasions, dayWindow, packingList, planTrip, tripDates, type TripDayPlan } from './trip'
import type { Slot } from './outfit-types'
import type { OccasionId, Profile } from './types'

const occ = (id: OccasionId) => DATA.occasions.find((o) => o.id === id)!
const ORDER: Slot[] = ['head', 'eyewear', 'outer', 'mid', 'top', 'bottom', 'socks', 'shoes', 'accessory']
const male: Profile = { gender: 'male', style: 'standard', skinTone: 2 }
const modest: Profile = { gender: 'female', style: 'modest', skinTone: 1 }

const plan = (ctxs: Array<keyof typeof SCENARIOS | null>, occasion: OccasionId = 'casual'): TripDayPlan[] =>
  tripDates('2026-12-20', ctxs.length).map((date, i) => ({ date, occasion, ctx: ctxs[i] ? SCENARIOS[ctxs[i]!] : null }))

describe('trip dates and days', () => {
  it('lists consecutive dates across months', () => {
    expect(tripDates('2026-12-30', 4)).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'])
  })

  it('plans the daytime, and only what is left of today', () => {
    expect(dayWindow('2026-12-21', '2026-12-20T15:00')).toEqual({ start: '2026-12-21T08:00', hours: 14 })
    expect(dayWindow('2026-12-20', '2026-12-20T06:00')).toEqual({ start: '2026-12-20T08:00', hours: 14 })
    expect(dayWindow('2026-12-20', '2026-12-20T15:00')).toEqual({ start: '2026-12-20T15:00', hours: 7 })
    expect(dayWindow('2026-12-20', '2026-12-20T21:00').hours).toBe(3)
  })

  it('makes the first and last day travel days when asked', () => {
    expect(dayOccasions(4, 'hiking', true)).toEqual(['travel', 'hiking', 'hiking', 'travel'])
    expect(dayOccasions(3, 'work', false)).toEqual(['work', 'work', 'work'])
    expect(dayOccasions(1, 'work', true)).toEqual(['work'])
  })
})

describe('planTrip', () => {
  it('gives every day with weather an outfit, in one palette', () => {
    const days = planTrip(plan(['ammanWinterRain', 'irbidFog', 'ammanSnow', null]), male, occ, DATA)
    expect(days.slice(0, 3).every((d) => d.outfit)).toBe(true)
    expect(days[3].outfit).toBeNull()
    expect(new Set(days.slice(0, 3).map((d) => d.outfit!.palette?.id)).size).toBe(1)
  })

  it('reuses bottoms, outer layers and shoes and changes tops', () => {
    const days = planTrip(plan(['mildCloudy', 'mildCloudy', 'mildCloudy', 'mildCloudy']), male, occ, DATA)
    const ids = (slot: Slot) => new Set(days.map((d) => d.outfit!.pieces.find((p) => p.slot === slot)?.item.id))
    expect(ids('shoes').size).toBe(1)
    expect(ids('bottom').size).toBeLessThanOrEqual(2)
    expect(ids('top').size).toBeGreaterThan(1)
  })

  it('still follows each day’s weather and occasion', () => {
    const days = planTrip(plan(['aqabaSummer', 'ammanSnow']), modest, occ, DATA)
    const [hot, snow] = days.map((d) => d.outfit!)
    expect(hot.pieces.some((p) => p.slot === 'outer' && !p.carry)).toBe(false)
    expect(snow.pieces.some((p) => p.slot === 'outer')).toBe(true)
    for (const o of [hot, snow]) expect(o.pieces.some((p) => p.slot === 'head' && p.item.tags.includes('hijab'))).toBe(true)
  })
})

describe('packingList', () => {
  it('counts tops and socks per day and everything else once', () => {
    const days = planTrip(plan(['mildCloudy', 'mildCloudy', 'mildCloudy']), male, occ, DATA)
    const list = packingList(days, ORDER)
    const worn = days.flatMap((d) => d.outfit!.pieces.filter((p) => p.slot === 'top'))
    expect(list.filter((l) => l.piece.slot === 'top').reduce((s, l) => s + l.count, 0)).toBe(worn.length)
    for (const l of list.filter((x) => !['top', 'socks'].includes(x.piece.slot))) expect(l.count).toBe(1)
    // Head to toe.
    const slots = list.map((l) => ORDER.indexOf(l.piece.slot))
    expect([...slots].sort((a, b) => a - b)).toEqual(slots)
  })

  it('lists one line per item and color', () => {
    const days = planTrip(plan(['ammanWinterRain', 'ammanWinterRain']), male, occ, DATA)
    const keys = packingList(days, ORDER).map((l) => l.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
