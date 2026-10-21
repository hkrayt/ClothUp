import { describe, expect, it } from 'vitest'
import { DATA } from './catalog'
import { generateOutfits } from './outfit'
import { ageGroup, build, feltContext, figureScale, personalize, stature } from './personal'
import { SCENARIOS } from './scenarios'
import type { Outfit } from './outfit-types'
import type { OccasionId, Profile } from './types'

const occ = (id: OccasionId) => DATA.occasions.find((o) => o.id === id)!
const male: Profile = { gender: 'male', style: 'standard', skinTone: 2 }
const female: Profile = { gender: 'female', style: 'standard', skinTone: 2 }
/** Average middle of the comfort ranges of the clothes worn now (lower = warmer clothes). */
const warmth = (o: Outfit) => {
  const worn = o.pieces.filter((p) => !p.carry && ['top', 'mid', 'outer', 'bottom'].includes(p.slot))
  return worn.reduce((s, p) => s + (p.item.feels[0] + p.item.feels[1]) / 2, 0) / worn.length
}

describe('profile details', () => {
  it('groups ages and ignores impossible values', () => {
    expect(ageGroup(15)).toBe('teen')
    expect(ageGroup(18)).toBe('young')
    expect(ageGroup(31)).toBe('adult')
    expect(ageGroup(60)).toBe('mature')
    expect(ageGroup(70)).toBe('senior')
    expect(ageGroup(undefined)).toBeNull()
    expect(ageGroup(3)).toBeNull()
    expect(ageGroup(Number.NaN)).toBeNull()
  })

  it('derives build and stature from height and weight', () => {
    expect(build({ heightCm: 175, weightKg: 52 })).toBe('slim')
    expect(build({ heightCm: 175, weightKg: 72 })).toBe('average')
    expect(build({ heightCm: 175, weightKg: 95 })).toBe('full')
    expect(build({ heightCm: 175 })).toBeNull()
    expect(stature({ gender: 'female', heightCm: 150 })).toBe('petite')
    expect(stature({ gender: 'male', heightCm: 190 })).toBe('tall')
  })

  it('scales the character within limits and leaves it alone without details', () => {
    expect(figureScale(male)).toEqual({ sx: 1, sy: 1 })
    const tall = figureScale({ ...male, heightCm: 220, weightKg: 200 })
    expect(tall.sy).toBeLessThanOrEqual(1.08)
    expect(tall.sx).toBeLessThanOrEqual(1.3)
    const small = figureScale({ ...female, heightCm: 120, weightKg: 30 })
    expect(small.sy).toBeGreaterThanOrEqual(0.86)
    expect(small.sx).toBeGreaterThanOrEqual(0.88)
  })

  it('turns "I feel the cold" and age into a temperature offset', () => {
    expect(personalize(male).offset).toBe(0)
    expect(personalize({ ...male, thermal: 'cold' }).offset).toBeGreaterThan(0)
    expect(personalize({ ...male, thermal: 'hot' }).offset).toBeLessThan(0)
    expect(personalize({ ...male, age: 72 }).offset).toBeGreaterThan(personalize({ ...male, age: 40 }).offset)
    const felt = feltContext(SCENARIOS.mildCloudy, 2.5)
    expect(felt.feelsMin).toBe(SCENARIOS.mildCloudy.feelsMin - 2.5)
    expect(felt.rainProb).toBe(SCENARIOS.mildCloudy.rainProb)
  })
})

describe('personal suggestions', () => {
  it('dresses someone who feels the cold warmer, but explains with the real forecast', () => {
    for (const sc of ['ammanAutumnEvening', 'mildCloudy', 'irbidFog'] as const) {
      const [normal] = generateOutfits(SCENARIOS[sc], male, occ('casual'), DATA)
      const [cold] = generateOutfits(SCENARIOS[sc], { ...male, thermal: 'cold' }, occ('casual'), DATA)
      expect(warmth(cold), sc).toBeLessThanOrEqual(warmth(normal))
      expect(cold.reasons.map((r) => r.key)).toContain('personalCold')
      // Temperatures quoted in the explanations are the forecast's, not the shifted ones.
      const quoted = (o: Outfit) => o.reasons.flatMap((r) => Object.values(r.params ?? {}))
      expect(quoted(cold).every((v) => quoted(normal).includes(v))).toBe(true)
    }
  })

  it('dresses someone who feels the heat lighter', () => {
    const [normal] = generateOutfits(SCENARIOS.ammanAutumnEvening, female, occ('casual'), DATA)
    const [hot] = generateOutfits(SCENARIOS.ammanAutumnEvening, { ...female, thermal: 'hot' }, occ('casual'), DATA)
    expect(warmth(hot)).toBeGreaterThanOrEqual(warmth(normal))
  })

  it('avoids heels and very sporty pieces for older people', () => {
    for (const o of ['wedding', 'dinner', 'formal'] as const) {
      const outfits = generateOutfits(SCENARIOS.mildCloudy, { ...female, age: 72 }, occ(o), DATA)
      for (const out of outfits) expect(out.pieces.some((p) => p.item.tags.includes('heels')), o).toBe(false)
    }
  })

  it('favours looser fits for a fuller build', () => {
    const loose = (o: Outfit[]) => o.flatMap((x) => x.pieces).filter((p) => p.item.tags.includes('loose')).length
    const fitted = (o: Outfit[]) => o.flatMap((x) => x.pieces).filter((p) => p.item.tags.includes('fitted')).length
    let a = 0
    let b = 0
    let f = 0
    for (const sc of ['ammanSpring', 'mildCloudy', 'deadSeaSpring', 'ammanAutumnEvening'] as const)
      for (const o of ['casual', 'work', 'university'] as const) {
        a += loose(generateOutfits(SCENARIOS[sc], female, occ(o), DATA))
        const full = generateOutfits(SCENARIOS[sc], { ...female, heightCm: 160, weightKg: 88 }, occ(o), DATA)
        b += loose(full)
        f += fitted(full)
      }
    expect(b).toBeGreaterThan(a)
    expect(f).toBe(0)
  })

  it('still keeps weather and modesty rules first', () => {
    const [rain] = generateOutfits(SCENARIOS.ammanWinterRain, { ...male, thermal: 'hot', age: 16 }, occ('casual'), DATA)
    const outer = rain.pieces.find((p) => p.slot === 'outer')!
    expect(outer.item.tags.some((t) => t === 'waterproof' || t === 'water-resistant')).toBe(true)
    const [modest] = generateOutfits(SCENARIOS.aqabaSummer, { gender: 'female', style: 'modest', skinTone: 1, thermal: 'hot', heightCm: 165, weightKg: 50 }, occ('casual'), DATA)
    expect(modest.pieces.some((p) => p.slot === 'head' && p.item.tags.includes('hijab'))).toBe(true)
  })
})

describe('my closet', () => {
  const ctx = SCENARIOS.ammanSpring
  const owned = ['m-tee', 'm-oxford', 'm-jeans', 'm-chinos', 'm-sneakers', 'm-denim-jacket', 'crew-socks']

  it('suggests only owned clothes when they suit the weather', () => {
    const outfits = generateOutfits(ctx, male, occ('casual'), DATA, { owned })
    expect(outfits.length).toBeGreaterThan(0)
    for (const o of outfits)
      for (const p of o.pieces.filter((x) => ['top', 'bottom', 'shoes', 'outer'].includes(x.slot))) {
        expect(owned, p.item.id).toContain(p.item.id)
        expect(p.missing).toBeUndefined()
      }
  })

  it('falls back to other items, marked as missing, when nothing owned fits', () => {
    const [o] = generateOutfits(SCENARIOS.ammanSnow, male, occ('casual'), DATA, { owned })
    const outer = o.pieces.find((p) => p.slot === 'outer')!
    expect(owned).not.toContain(outer.item.id)
    expect(outer.missing).toBe(true)
  })

  it('never marks reminders like sunscreen as missing', () => {
    const outfits = generateOutfits(SCENARIOS.aqabaSummer, male, occ('casual'), DATA, { owned })
    const reminders = outfits.flatMap((o) => o.pieces).filter((p) => p.item.tags.includes('reminder'))
    expect(reminders.length).toBeGreaterThan(0)
    for (const p of reminders) expect(p.missing).toBeUndefined()
  })
})
