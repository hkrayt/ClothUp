import { describe, expect, it } from 'vitest'
import { COLORS, DATA } from './catalog'
import { deltaE } from './color'
import { generateOutfits } from './outfit'
import { SCENARIOS } from './scenarios'
import { SKIN_TONES, depthOf, nearFace, styleProfile, styleScore } from './styling'
import type { Outfit, OutfitPiece } from './outfit-types'
import type { OccasionId, Profile } from './types'

const occ = (id: OccasionId) => DATA.occasions.find((o) => o.id === id)!
const item = (id: string) => DATA.items.find((i) => i.id === id)!
const piece = (id: string, color: string, extra: Partial<OutfitPiece> = {}): OutfitPiece => ({ slot: item(id).slot, item: item(id), fabric: '', color, ...extra })
const hex = (id: string) => COLORS.hex(id)
const fixed = (id: string) => !!COLORS.color(id)?.fixed
const base: Profile = { gender: 'female', style: 'standard', skinTone: 2 }

const SCEN = ['ammanSpring', 'mildCloudy', 'ammanWinterRain', 'aqabaSummer', 'irbidFog', 'ammanAutumnEvening'] as const
const OCC: OccasionId[] = ['casual', 'work', 'university', 'dinner', 'shopping']
function many(p: Profile): Outfit[] {
  return SCEN.flatMap((s) => OCC.flatMap((o) => generateOutfits(SCENARIOS[s], p, occ(o), DATA)))
}

describe('style profile', () => {
  it('reads skin depth and personal contrast from the chosen tone', () => {
    expect(SKIN_TONES.map(depthOf)).toEqual(['fair', 'light', 'medium', 'tan', 'deep'])
    expect(styleProfile({ ...base, skinTone: 0 }).contrast).toBe('high')
    expect(styleProfile({ ...base, skinTone: 4 }).contrast).toBe('low')
  })

  it('reads proportions from height and weight', () => {
    expect(styleProfile({ ...base, heightCm: 150, weightKg: 50 }).tonal).toBe(true)
    expect(styleProfile({ ...base, heightCm: 165, weightKg: 85 }).tonal).toBe(true)
    expect(styleProfile({ ...base, heightCm: 178, weightKg: 62 }).split).toBe(true)
    const avg = styleProfile({ ...base, heightCm: 163, weightKg: 58 })
    expect([avg.tonal, avg.split]).toEqual([false, false])
  })
})

describe('styleScore', () => {
  it('marks colors that melt into the skin near the face', () => {
    const light = styleProfile({ ...base, skinTone: 1 })
    const nude = styleScore([piece('f-tee', 'nude'), piece('f-jeans', 'denim-mid')], light, hex, fixed)
    const navy = styleScore([piece('f-tee', 'navy'), piece('f-jeans', 'denim-mid')], light, hex, fixed)
    expect(nude.score).toBeLessThan(navy.score)
    expect(navy.notes.map((n) => n.key)).toContain('skin')
  })

  it('gives deeper skin rich colors and crisp whites instead of browns', () => {
    const deep = styleProfile({ ...base, skinTone: 4 })
    const s = (c: string) => styleScore([piece('f-tee', c), piece('f-jeans', 'denim-mid')], deep, hex, fixed).score
    expect(s('white')).toBeGreaterThan(s('chocolate'))
    expect(s('cobalt')).toBeGreaterThan(s('brown'))
  })

  it('counts a hijab and a scarf as near the face, and the open coat over the top', () => {
    const pieces = [piece('f-hijab-modal', 'navy'), piece('f-tee', 'white'), piece('f-wool-coat', 'camel'), piece('scarf', 'burgundy')]
    const near = nearFace(pieces).map((n) => n.piece.item.id)
    expect(near).toEqual(['f-hijab-modal', 'scarf', 'f-wool-coat', 'f-tee'])
  })

  it('favours one color family for petite figures and a clear break for tall ones', () => {
    const petite = styleProfile({ ...base, heightCm: 150, weightKg: 48 })
    const tall = styleProfile({ ...base, heightCm: 180, weightKg: 62 })
    const tonal = [piece('f-tee', 'navy'), piece('f-tailored-trousers', 'navy')]
    const split = [piece('f-tee', 'white'), piece('f-tailored-trousers', 'black')]
    expect(styleScore(tonal, petite, hex, fixed).score).toBeGreaterThan(styleScore(split, petite, hex, fixed).score)
    expect(styleScore(split, tall, hex, fixed).notes.map((n) => n.key)).toContain('split')
  })
})

describe('styled outfits', () => {
  it('rarely puts a skin-matching color next to the face, for every skin tone', () => {
    for (let tone = 0; tone < SKIN_TONES.length; tone++) {
      const outfits = many({ ...base, skinTone: tone })
      const faces = outfits.flatMap((o) => nearFace(o.pieces)).filter((n) => !fixed(n.piece.color!))
      const melts = faces.filter((n) => deltaE(hex(n.piece.color!), SKIN_TONES[tone]) < 0.07)
      expect(melts.length / faces.length, `tone ${tone}`).toBeLessThan(0.05)
    }
  })

  it('dresses petite figures in more tonal outfits than tall ones', () => {
    const tonalShare = (p: Profile) => {
      const os = many(p).filter((o) => o.pieces.some((x) => x.slot === 'bottom'))
      const tonal = os.filter((o) => {
        const t = o.pieces.find((x) => x.slot === 'top')!.color!
        const b = o.pieces.find((x) => x.slot === 'bottom')!.color!
        return deltaE(hex(t), hex(b)) <= 0.12
      })
      return tonal.length / os.length
    }
    expect(tonalShare({ ...base, heightCm: 150, weightKg: 48 })).toBeGreaterThan(tonalShare({ ...base, heightCm: 180, weightKg: 62 }))
  })

  it('uses trend palettes for a modern look and quiet ones for a minimal look', () => {
    const palettes = new Map(COLORS.data.palettes.map((p) => [p.id, p]))
    const share = (p: Profile, look: string) => {
      const os = many(p)
      return os.filter((o) => (palettes.get(o.palette!.id)?.looks ?? []).includes(look as never)).length / os.length
    }
    expect(share({ ...base, look: 'modern' }, 'modern')).toBeGreaterThan(share(base, 'modern') + 0.2)
    expect(share({ ...base, look: 'minimal' }, 'minimal')).toBeGreaterThan(share(base, 'minimal'))
  })

  it('keeps minimal looks plain and calm', () => {
    const os = many({ ...base, look: 'minimal' })
    expect(os.some((o) => o.pieces.some((p) => p.pattern && p.pattern !== 'embroidery'))).toBe(false)
  })

  it('explains personal choices on the palette card', () => {
    const notes = many({ ...base, skinTone: 4, heightCm: 150, weightKg: 48, look: 'modern' }).flatMap((o) => o.palette!.notes.map((n) => n.key))
    expect(notes).toContain('skin')
    expect(notes.some((k) => k === 'tonal' || k === 'column')).toBe(true)
    expect(notes).toContain('look.modern')
  })
})
