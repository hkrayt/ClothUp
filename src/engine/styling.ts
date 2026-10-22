/**
 * Personal styling: which colors flatter the chosen skin tone, which proportions suit the body
 * (from height and weight), and the overall look (classic, modern, minimal).
 * All of it nudges the palette scores; weather and occasion still decide first.
 */
import type { OutfitPiece } from './outfit-types'
import type { Look, Profile } from './types'
import { build, stature } from './personal'
import { chroma, deltaE, lightness } from './color'

/** Character skin tones, light to deep (also used to draw the character). */
export const SKIN_TONES = ['#F5D9C6', '#E9C09F', '#D29C76', '#A76F4C', '#6D452E']
/** The character's hair color. */
export const HAIR = '#2E211B'

export type Depth = 'fair' | 'light' | 'medium' | 'tan' | 'deep'

export interface StyleProfile {
  skin: string
  depth: Depth
  /** Skin-to-hair lightness difference: fair skin with dark hair is "high". */
  contrast: 'high' | 'medium' | 'low'
  /** Petite or fuller figures: one color family top to toe lengthens the silhouette. */
  tonal: boolean
  /** Tall (or slim) figures carry a clear break between top and bottom. */
  split: boolean
  look: Look
}

export function depthOf(skin: string): Depth {
  const l = lightness(skin)
  return l >= 0.87 ? 'fair' : l >= 0.79 ? 'light' : l >= 0.68 ? 'medium' : l >= 0.52 ? 'tan' : 'deep'
}

export function styleProfile(p: Profile): StyleProfile {
  const skin = SKIN_TONES[p.skinTone] ?? SKIN_TONES[2]
  const personal = lightness(skin) - lightness(HAIR)
  const body = build(p)
  const height = stature(p)
  return {
    skin,
    depth: depthOf(skin),
    contrast: personal >= 0.5 ? 'high' : personal >= 0.3 ? 'medium' : 'low',
    tonal: height === 'petite' || body === 'full',
    split: height === 'tall' || (body === 'slim' && height !== 'petite'),
    look: p.look ?? 'classic',
  }
}

export interface StyleNote {
  key: string
  colors?: string[]
}

/** The pieces seen around the face: head covering, scarf, and the top (or the layer worn over it). */
export function nearFace(pieces: OutfitPiece[]): Array<{ piece: OutfitPiece; weight: number }> {
  const out: Array<{ piece: OutfitPiece; weight: number }> = []
  const worn = (slot: string) => pieces.find((p) => p.slot === slot && !p.carry && p.color)
  const head = worn('head')
  if (head && (head.item.tags.includes('hijab') || head.item.tags.includes('head-cover'))) out.push({ piece: head, weight: 1.2 })
  const scarf = pieces.find((p) => p.slot === 'accessory' && p.item.tags.includes('scarf') && p.color)
  if (scarf) out.push({ piece: scarf, weight: 1 })
  const outer = worn('outer')
  const top = worn('top')
  if (outer) out.push({ piece: outer, weight: 0.8 })
  if (top) out.push({ piece: top, weight: outer ? 0.5 : 1 })
  return out
}

/**
 * Scores an outfit's colors for this person. `hex` resolves color ids; `fixed` colors (shemagh
 * checks, tortoiseshell) are left out because they can't change.
 */
export function styleScore(
  pieces: OutfitPiece[],
  sp: StyleProfile,
  hex: (id: string) => string,
  fixed: (id: string) => boolean,
): { score: number; notes: StyleNote[] } {
  let score = 0
  const notes: StyleNote[] = []

  // 1. Around the face: avoid colors that melt into the skin; reward ones that frame it.
  let face = 0
  let best: { color: string; gain: number } | null = null
  for (const { piece, weight } of nearFace(pieces)) {
    const c = piece.color!
    if (fixed(c)) continue
    const h = hex(c)
    const d = deltaE(h, sp.skin)
    const l = lightness(h)
    const ch = chroma(h)
    let s = d < 0.05 ? -3 : d < 0.07 ? -2 : d < 0.1 ? -0.7 : 0
    if (sp.depth === 'deep' || sp.depth === 'tan') {
      // Rich, saturated colors and crisp whites glow against deeper skin.
      if (ch >= 0.09) s += 0.6
      if (l >= 0.9) s += 0.6
    } else if (sp.depth === 'medium') {
      if (Math.abs(l - lightness(sp.skin)) >= 0.2) s += 0.4
    } else {
      // Medium-deep and jewel colors frame light skin better than pale beiges.
      if (l <= 0.62) s += 0.5
      else if (ch >= 0.03 && ch <= 0.1 && Math.abs(l - lightness(sp.skin)) >= 0.12) s += 0.3
    }
    face += s * weight
    if (s > 0 && (!best || s * weight > best.gain)) best = { color: c, gain: s * weight }
  }
  score += Math.max(-4, Math.min(2.5, face))
  if (best && face > 0.4) notes.push({ key: 'skin', colors: [best.color] })

  // 2. Proportions: the visible top (or one-piece) against the bottom.
  const outer = pieces.find((p) => p.slot === 'outer' && !p.carry && p.color)
  const top = pieces.find((p) => p.slot === 'top' && p.color)
  const bottom = pieces.find((p) => p.slot === 'bottom' && p.color)
  const onePiece = !!top?.item.fills?.includes('bottom')
  if (top && (bottom || onePiece)) {
    const a = hex(top.color!)
    const b = onePiece ? a : hex(bottom!.color!)
    const dl = Math.abs(lightness(a) - lightness(b))
    const close = onePiece || deltaE(a, b) <= 0.12
    if (sp.tonal) {
      if (close) {
        score += 1.2
        notes.push({ key: outer && deltaE(hex(outer.color!), a) > 0.15 ? 'column' : 'tonal' })
      } else if (dl >= 0.4) score -= 0.8
    } else if (sp.split && !onePiece && dl >= 0.25) {
      score += 0.6
      notes.push({ key: 'split' })
    }
    // 3. Fair skin with dark hair (high personal contrast) suits crisp light-dark outfits.
    if (sp.contrast === 'high' && !sp.tonal) {
      const ls = [a, b, ...(outer ? [hex(outer.color!)] : [])].map(lightness)
      const spread = Math.max(...ls) - Math.min(...ls)
      if (spread >= 0.4) {
        score += 0.8
        notes.push({ key: 'crisp' })
      } else if (spread < 0.15) score -= 0.3
    }
  }

  // 4. Minimal looks keep to calm, quiet colors.
  if (sp.look === 'minimal') {
    const brights = pieces.filter((p) => p.color && !fixed(p.color) && !p.carry && chroma(hex(p.color)) >= 0.11).length
    score -= brights * 1
  }

  return { score, notes }
}
