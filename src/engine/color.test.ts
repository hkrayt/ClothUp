import { describe, expect, it } from 'vitest'
import { COLORS, DATA } from './catalog'
import { deltaE, hexToOklab, lightness, shade } from './color'
import { generateOutfits } from './outfit'
import { SCENARIOS } from './scenarios'
import type { Profile } from './types'

const PROFILES: Profile[] = [
  { gender: 'male', style: 'standard', skinTone: 2 },
  { gender: 'male', style: 'traditional', skinTone: 2 },
  { gender: 'female', style: 'standard', skinTone: 2 },
  { gender: 'female', style: 'modest', skinTone: 2 },
]
const ids = new Set(DATA.colors.colors.map((c) => c.id))

describe('color data', () => {
  it('has unique ids and valid hex values', () => {
    expect(ids.size).toBe(DATA.colors.colors.length)
    for (const c of DATA.colors.colors) expect(c.hex, c.id).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('groups, items and palettes only reference known colors', () => {
    for (const [g, list] of Object.entries(DATA.colors.groups)) for (const c of list) expect(ids.has(c), `@${g}: ${c}`).toBe(true)
    for (const item of DATA.items)
      for (const c of item.colors) {
        if (c.startsWith('@')) expect(DATA.colors.groups[c.slice(1)], `${item.id}: ${c}`).toBeDefined()
        else expect(ids.has(c), `${item.id}: ${c}`).toBe(true)
      }
    for (const p of DATA.colors.palettes)
      for (const role of ['base', 'secondary', 'accent', 'ground', 'outer'] as const) expect(ids.has(p[role]), `${p.id}.${role}`).toBe(true)
  })

  it('every clothing item except reminders has at least one color', () => {
    for (const item of DATA.items) if (!item.tags.includes('reminder')) expect(COLORS.allowed(item).length, item.id).toBeGreaterThan(0)
  })
})

describe('color math', () => {
  it('converts white and black to OKLab lightness 1 and ~0', () => {
    expect(hexToOklab('#FFFFFF')[0]).toBeCloseTo(1, 3)
    expect(hexToOklab('#000000')[0]).toBeCloseTo(0, 3)
  })

  it('measures distance and lightness', () => {
    expect(deltaE('#1F2B47', '#1F2B47')).toBe(0)
    expect(deltaE('#FFFFFF', '#000000')).toBeGreaterThan(0.9)
    expect(lightness('#F4F0E6')).toBeGreaterThan(lightness('#1F2B47'))
    expect(shade('#ffffff', 0.5)).toBe('#808080')
  })
})

describe('palette notes describe the colors actually used', () => {
  it('one color is monochrome; greys are neutrals; greys + a color name the color last', () => {
    expect(COLORS.explain(['navy'], 'analogous').noteKey).toBe('monochrome')
    expect(COLORS.explain(['white', 'grey', 'black'], 'monochrome').noteKey).toBe('neutrals')
    const e = COLORS.explain(['grey-light', 'denim-dark', 'grey', 'black'], 'monochrome')
    expect(e.noteKey).toBe('neutral-accent')
    expect(e.colors[2]).toBe('denim-dark')
  })
})

describe('outfit palettes', () => {
  for (const [name, ctx] of Object.entries(SCENARIOS)) {
    for (const profile of PROFILES) {
      it(`${name} · ${profile.gender}/${profile.style}`, () => {
        for (const occ of DATA.occasions) {
          const outfits = generateOutfits(ctx, profile, occ, DATA)
          for (const o of outfits) {
            expect(o.palette, `${occ.id} palette`).toBeDefined()
            for (const p of o.pieces) {
              if (!p.color) continue
              expect(COLORS.allowed(p.item), `${p.item.id} can be ${p.color}`).toContain(p.color)
            }
            expect(o.palette!.swatches.length).toBeGreaterThan(0)
            if (profile.style === 'modest') {
              const hijab = o.pieces.find((p) => p.slot === 'head')!
              expect(o.palette!.swatches.map((s) => s.color), 'hijab color is in the palette').toContain(hijab.color)
            }
          }
          // The best option has no clashing near-miss colors and at most the allowed number of brights.
          if (outfits[0]) expect(COLORS.harmonyPenalty(outfits[0].pieces, outfits[0].palette!.strategy, occ.moods[0]), occ.id).toBeLessThan(3)
        }
      })
    }
  }

  it('picks light colors for the Aqaba summer sun', () => {
    for (const profile of PROFILES) {
      const [o] = generateOutfits(SCENARIOS.aqabaSummer, profile, DATA.occasions.find((x) => x.id === 'casual')!, DATA)
      const main = o.pieces.filter((p) => ['top', 'bottom'].includes(p.slot) && p.color)
      const avg = main.reduce((s, p) => s + lightness(COLORS.hex(p.color!)), 0) / main.length
      expect(avg, profile.style).toBeGreaterThan(0.7)
    }
  })

  it('gives each option a different palette', () => {
    const outfits = generateOutfits(SCENARIOS.ammanSpring, PROFILES[0], DATA.occasions.find((x) => x.id === 'casual')!, DATA)
    expect(new Set(outfits.map((o) => o.palette!.id)).size).toBe(outfits.length)
  })
})
