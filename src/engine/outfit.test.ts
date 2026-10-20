import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { DATA } from './catalog'
import { generateOutfits, temperatureFit } from './outfit'
import { SCENARIOS } from './scenarios'
import type { Outfit } from './outfit-types'
import type { OccasionId, Profile } from './types'

const PROFILES: Profile[] = [
  { gender: 'male', style: 'standard', skinTone: 2 },
  { gender: 'male', style: 'traditional', skinTone: 2 },
  { gender: 'female', style: 'standard', skinTone: 2 },
  { gender: 'female', style: 'modest', skinTone: 2 },
]
const OCCASIONS = DATA.occasions.map((o) => o.id)
const occ = (id: OccasionId) => DATA.occasions.find((o) => o.id === id)!

const slotItem = (o: Outfit, slot: string) => o.pieces.find((p) => p.slot === slot)?.item
const all = (o: Outfit) => o.pieces.map((p) => p.item)

describe('catalog data', () => {
  const itemSchema = z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    slot: z.enum(['head', 'eyewear', 'outer', 'mid', 'top', 'bottom', 'socks', 'shoes', 'accessory']),
    fills: z.array(z.enum(['bottom'])).optional(),
    name: z.object({ en: z.string().min(2), ar: z.string().min(2) }),
    gender: z.array(z.enum(['male', 'female'])).min(1),
    style: z.array(z.enum(['standard', 'modest', 'traditional'])).min(1),
    occasions: z.array(z.enum(OCCASIONS as [OccasionId, ...OccasionId[]])).min(1),
    formality: z.number().min(0).max(5),
    feels: z.tuple([z.number(), z.number()]).refine(([a, b]) => a < b),
    tags: z.array(z.string()),
    coverage: z.object({ arms: z.enum(['none', 'short', 'long']).optional(), legs: z.enum(['short', 'knee', 'long']).optional() }).optional(),
    fabrics: z.array(z.string()),
    colors: z.array(z.string()),
    svg: z.object({ part: z.string(), variant: z.string().optional() }),
  })

  it('every item is valid', () => {
    for (const i of DATA.items) itemSchema.parse(i)
  })

  it('ids are unique and fabrics exist', () => {
    const ids = DATA.items.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    const fabrics = new Set(DATA.fabrics.map((f) => f.id))
    for (const i of DATA.items) for (const f of i.fabrics) expect(fabrics.has(f), `${i.id}: ${f}`).toBe(true)
  })

  it('rules only reference existing item ids', () => {
    const ids = new Set(DATA.items.map((i) => i.id))
    for (const r of DATA.rules) for (const a of r.then.add ?? []) if (!a.startsWith('#')) expect(ids.has(a), `${r.id}: ${a}`).toBe(true)
  })
})

describe('temperatureFit', () => {
  it('rewards the middle of the range and rules out far misses', () => {
    expect(temperatureFit(20, [10, 30])).toBeGreaterThan(temperatureFit(28, [10, 30]))
    expect(temperatureFit(32, [10, 30])).toBe(-3)
    expect(temperatureFit(40, [10, 30])).toBe(-Infinity)
  })
})

describe('generateOutfits — every scenario × occasion × profile', () => {
  for (const [name, ctx] of Object.entries(SCENARIOS)) {
    for (const profile of PROFILES) {
      for (const occasion of OCCASIONS) {
        const label = `${name} · ${profile.gender}/${profile.style} · ${occasion}`
        it(label, () => {
          const outfits = generateOutfits(ctx, profile, occ(occasion), DATA)
          expect(outfits.length, 'at least one outfit').toBeGreaterThan(0)
          expect(outfits.length).toBeLessThanOrEqual(3)

          for (const o of outfits) {
            const top = slotItem(o, 'top')!
            expect(top, 'has a top').toBeDefined()
            expect(slotItem(o, 'shoes'), 'has shoes').toBeDefined()
            if (!top.fills?.includes('bottom')) expect(slotItem(o, 'bottom'), 'has a bottom').toBeDefined()

            // One item per slot, except accessories
            const slots = o.pieces.filter((p) => p.slot !== 'accessory').map((p) => p.slot)
            expect(new Set(slots).size).toBe(slots.length)

            for (const i of all(o)) {
              expect(i.gender).toContain(profile.gender)
              expect(i.occasions).toContain(occasion)
            }

            if (profile.style === 'modest') {
              expect(slotItem(o, 'head')?.tags, 'hijab').toContain('hijab')
              for (const i of all(o)) {
                if (['top', 'mid', 'outer'].includes(i.slot) && i.coverage?.arms) expect(i.coverage.arms, i.id).toBe('long')
                if ((i.slot === 'bottom' || i.fills) && i.coverage?.legs) expect(i.coverage.legs, i.id).toBe('long')
              }
            }

            if (occasion === 'religious') {
              for (const i of all(o)) expect(i.tags, i.id).not.toContain('shorts')
              if (profile.gender === 'female') expect(slotItem(o, 'head')?.tags).toContain('head-cover')
            }

            if (occasion === 'gym') {
              for (const s of ['top', 'bottom', 'shoes']) {
                const i = slotItem(o, s)
                if (i) expect(i.tags, i.id).toContain('sporty')
              }
            }

            if (ctx.rainProb >= 50) {
              const outer = slotItem(o, 'outer')
              expect(outer, 'rain needs an outer layer').toBeDefined()
              // Waterproof outer layer — or, over a suit/bisht at a formal event, an umbrella instead.
              const waterproof = outer!.tags.some((t) => ['waterproof', 'water-resistant'].includes(t))
              const formalWithUmbrella =
                outer!.tags.some((t) => ['formal', 'suit', 'tailored'].includes(t)) && all(o).some((i) => i.id === 'umbrella')
              expect(waterproof || formalWithUmbrella, outer!.id).toBe(true)
              expect(slotItem(o, 'shoes')!.tags.some((t) => ['closed', 'boots'].includes(t))).toBe(true)
            }

            if (ctx.feelsMin >= 30) {
              for (const i of all(o)) expect(['down', 'fleece', 'sheepskin'].some((f) => i.fabrics.length === 1 && i.fabrics[0] === f), i.id).toBe(false)
            }

            if (ctx.snowCm > 0 || ctx.feelsMin <= 0) {
              expect(slotItem(o, 'shoes')!.tags.some((t) => ['boots', 'closed'].includes(t))).toBe(true)
              expect(slotItem(o, 'outer'), 'snow needs a coat').toBeDefined()
            }
          }
        })
      }
    }
  }
})

describe('specific suggestions', () => {
  const male = PROFILES[0]
  const trad = PROFILES[1]
  const modest = PROFILES[3]

  it('professional man in Amman winter rain gets a waterproof coat, closed leather shoes and an umbrella', () => {
    const [o] = generateOutfits(SCENARIOS.ammanWinterRain, male, occ('work'), DATA)
    expect(slotItem(o, 'outer')!.tags).toContain('waterproof')
    expect(slotItem(o, 'shoes')!.tags).toContain('closed')
    expect(all(o).map((i) => i.id)).toContain('umbrella')
  })

  it('formal man gets a suit jacket; traditional wedding gets a bisht and shemagh', () => {
    expect(slotItem(generateOutfits(SCENARIOS.mildCloudy, male, occ('formal'), DATA)[0], 'outer')!.id).toBe('m-suit-jacket')
    const [w] = generateOutfits(SCENARIOS.mildCloudy, trad, occ('wedding'), DATA)
    expect(slotItem(w, 'outer')!.id).toBe('m-bisht')
    expect(slotItem(w, 'head')!.tags).toContain('shemagh')
  })

  it('modest outfit in Aqaba heat uses breathable fabrics and a chiffon hijab', () => {
    const [o] = generateOutfits(SCENARIOS.aqabaSummer, modest, occ('casual'), DATA)
    expect(slotItem(o, 'head')!.id).toBe('f-hijab-chiffon')
    for (const p of o.pieces.filter((p) => ['top', 'bottom'].includes(p.slot))) expect(['linen', 'cotton', 'chiffon']).toContain(p.fabric)
  })

  it('Wadi Rum evening suggests layers and sun protection', () => {
    const [o] = generateOutfits(SCENARIOS.wadiRumNight, male, occ('hiking'), DATA)
    expect(slotItem(o, 'outer')).toBeDefined()
    expect(all(o).map((i) => i.id)).toEqual(expect.arrayContaining(['sunglasses', 'sunscreen', 'water-bottle']))
    expect(o.reasons.map((r) => r.key)).toContain('layers')
  })

  it('sandstorm adds eye and face protection', () => {
    const [o] = generateOutfits(SCENARIOS.sandstorm, male, occ('travel'), DATA)
    const ids = all(o).map((i) => i.id)
    expect(ids).toContain('sunglasses')
    expect(ids.some((id) => id === 'face-scarf' || id === 'face-mask')).toBe(true)
    expect(o.reasons[0].key).toBe('sandstorm')
  })

  it('a warm day that cools in the evening marks the jacket as "take along"', () => {
    const [o] = generateOutfits(SCENARIOS.ammanAutumnEvening, male, occ('casual'), DATA)
    expect(o.pieces.find((p) => p.slot === 'outer')?.carry).toBe(true)
  })

  it('returns distinct alternatives', () => {
    const outfits = generateOutfits(SCENARIOS.ammanSpring, male, occ('casual'), DATA)
    expect(outfits).toHaveLength(3)
    const sigs = outfits.map((o) => ['top', 'bottom', 'outer', 'shoes'].map((s) => slotItem(o, s)?.id).join('|'))
    expect(new Set(sigs).size).toBe(3)
  })

  it('locks force an item in a slot', () => {
    const [o] = generateOutfits(SCENARIOS.ammanSpring, male, occ('casual'), DATA, { locks: { top: 'm-polo' } })
    expect(slotItem(o, 'top')!.id).toBe('m-polo')
  })
})
