import type { ClothingItem, Outfit, OutfitPiece, Pattern, Slot } from './outfit-types'
import type { Mood, Occasion, WeatherContext } from './types'

export interface ColorDef {
  id: string
  hex: string
  name: { en: string; ar: string }
  chroma: 'muted' | 'bright'
  /** Fixed colors (patterns, tortoiseshell) are never re-assigned and skip harmony checks. */
  fixed?: boolean
  pattern?: string
}

export type Strategy = 'neutral-accent' | 'analogous' | 'complementary' | 'monochrome'
export type Role = 'base' | 'secondary' | 'accent' | 'ground' | 'outer'

export interface Palette {
  id: string
  strategy: Strategy
  moods: Mood[]
  base: string
  secondary: string
  accent: string
  ground: string
  outer: string
  bands?: string[]
}

export interface ColorData {
  colors: ColorDef[]
  groups: Record<string, string[]>
  palettes: Palette[]
}

export interface Swatch {
  color: string
  role: Role
  slots: Slot[]
}

export interface PaletteResult {
  id: string
  strategy: Strategy
  swatches: Swatch[]
  /** i18n keys under "palette.*" with color ids to name. */
  notes: Array<{ key: string; colors?: string[] }>
}

// ---------- color math (OKLab) ----------

type Lab = [number, number, number]

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

const labCache = new Map<string, Lab>()

export function hexToOklab(hex: string): Lab {
  const cached = labCache.get(hex)
  if (cached) return cached
  const lab = toOklab(hex)
  labCache.set(hex, lab)
  return lab
}

function toOklab(hex: string): Lab {
  const n = parseInt(hex.slice(1), 16)
  const r = srgbToLinear((n >> 16) & 255)
  const g = srgbToLinear((n >> 8) & 255)
  const b = srgbToLinear(n & 255)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

export function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = hexToOklab(a)
  const [l2, a2, b2] = hexToOklab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

export function lightness(hex: string): number {
  return hexToOklab(hex)[0]
}

/** OKLCH chroma: ~0 for greys, higher for saturated colors. */
export function chroma(hex: string): number {
  const [, a, b] = hexToOklab(hex)
  return Math.hypot(a, b)
}

/** Darker shade for folds and outlines in the illustration. */
export function shade(hex: string, amount = 0.14): string {
  const n = parseInt(hex.slice(1), 16)
  const f = 1 - amount
  const ch = (v: number) => Math.round(v * f).toString(16).padStart(2, '0')
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`
}

// ---------- engine ----------

/** Below this OKLab distance two different colors look like a failed match (navy vs black). */
const NEAR_MISS: [number, number] = [0.025, 0.07]

export class ColorEngine {
  private byId: Map<string, ColorDef>
  constructor(readonly data: ColorData) {
    this.byId = new Map(data.colors.map((c) => [c.id, c]))
  }

  color(id: string): ColorDef | undefined {
    return this.byId.get(id)
  }

  hex(id: string): string {
    return this.byId.get(id)?.hex ?? '#999999'
  }

  /** Expands "@group" references to color ids. */
  allowed(item: ClothingItem): string[] {
    const out = new Set<string>()
    for (const c of item.colors) {
      if (c.startsWith('@')) this.data.groups[c.slice(1)]?.forEach((g) => out.add(g))
      else out.add(c)
    }
    return [...out]
  }

  private nearest(target: string, options: string[]): { id: string; dist: number } {
    let best = { id: options[0], dist: Infinity }
    for (const o of options) {
      const d = deltaE(this.hex(target), this.hex(o))
      if (d < best.dist) best = { id: o, dist: d }
    }
    return best
  }

  /** Assigns a color to one piece from a palette; returns the match quality. */
  assign(piece: OutfitPiece, palette: Palette): { color: string; role: Role; quality: number } | null {
    const options = this.allowed(piece.item)
    if (options.length === 0) return null
    const roles = rolesFor(piece)
    if (options.length === 1 || this.byId.get(options[0])?.fixed) return { color: options[0], role: roles[0], quality: 0 }
    for (const [i, role] of roles.entries()) {
      if (options.includes(palette[role])) return { color: palette[role], role, quality: 3 - i * 0.5 }
    }
    const near = this.nearest(palette[roles[0]], options)
    return { color: near.id, role: roles[0], quality: near.dist < 0.08 ? 1 : -1 - near.dist * 6 }
  }

  /** Penalty for colors that fight each other. */
  harmonyPenalty(pieces: OutfitPiece[], strategy: Strategy, mood: Mood): number {
    const main = pieces.filter((p) => p.color && MAIN.includes(p.slot) && !this.byId.get(p.color)?.fixed && !p.carry)
    let penalty = 0
    for (let i = 0; i < main.length; i++) {
      for (let j = i + 1; j < main.length; j++) {
        const a = main[i].color!
        const b = main[j].color!
        if (a === b) continue
        const d = deltaE(this.hex(a), this.hex(b))
        if (d > NEAR_MISS[0] && d < NEAR_MISS[1]) penalty += 3
      }
    }
    const top = pieces.find((p) => p.slot === 'top')
    const bottom = pieces.find((p) => p.slot === 'bottom')
    if (top?.color && bottom?.color && strategy !== 'monochrome' && deltaE(this.hex(top.color), this.hex(bottom.color)) < 0.06)
      penalty += 2
    // A hijab in exactly the coat's color reads as one block; a step lighter or darker looks better.
    const hijab = pieces.find((p) => p.slot === 'head' && p.item.tags.includes('hijab'))
    const outer = pieces.find((p) => p.slot === 'outer' && !p.carry)
    if (hijab?.color && hijab.color === outer?.color) penalty += 1.5
    const brights = new Set(main.filter((p) => this.byId.get(p.color!)?.chroma === 'bright').map((p) => p.color))
    const allowedBright = mood === 'bright' ? 2 : 1
    if (brights.size > allowedBright) penalty += 3 * (brights.size - allowedBright)
    return penalty
  }

  /** Colors an outfit with the best palette; `avoid` lists palettes already used by other options. */
  colorize(outfit: Outfit, ctx: WeatherContext, occasion: Occasion, avoid: string[] = [], only?: string, allowPattern = false): Outfit {
    let best: { score: number; pieces: OutfitPiece[]; palette: Palette } | null = null
    const sunnyHeat = ctx.feelsMax >= 28 && ctx.uvMax >= 5
    const somber = occasion.moods[0] === 'somber'
    const candidates = this.data.palettes.filter((p) => !only || p.id === only)

    for (const palette of candidates.length ? candidates : this.data.palettes) {
      const moodIndex = palette.moods.findIndex((m) => occasion.moods.includes(m))
      const moodRank = moodIndex === -1 ? -1 : occasion.moods.indexOf(palette.moods[moodIndex])
      let score = moodIndex === -1 ? -4 : 3 - moodRank
      if (palette.bands) score += palette.bands.includes(ctx.band) ? 1 : -3
      if (avoid.includes(palette.id)) score -= 4

      const pieces = outfit.pieces.map((p) => {
        const a = this.assign(p, palette)
        if (!a) return p
        const weight = MAIN.includes(p.slot) ? 1 : 0.4
        score += a.quality * weight
        if (sunnyHeat && HEAT_EXPOSED.includes(p.slot) && !p.carry && lightness(this.hex(a.color)) < 0.45) score -= 1.5
        // Condolence visits: quiet, dark, unsaturated colors on everything that shows.
        if (somber && MAIN.includes(p.slot) && !this.byId.get(a.color)?.fixed && chroma(this.hex(a.color)) > 0.07) score -= 3
        return { ...p, color: a.color }
      })
      score -= this.harmonyPenalty(pieces, palette.strategy, occasion.moods[0])
      if (!best || score > best.score) best = { score, pieces, palette }
    }
    if (!best) return outfit

    const pieces = this.applyPatterns(best.pieces, best.palette, occasion, allowPattern && !somber)
    const palette = this.describe(pieces, best.palette, sunnyHeat)
    const patterned = pieces.find((p) => p.pattern && p.pattern !== 'embroidery')
    if (patterned) palette.notes.push({ key: 'pattern', colors: [patterned.color!, patterned.patternColor!] })
    return { ...outfit, pieces, palette }
  }

  /**
   * Embroidered items always show their trim (gold for festive and formal occasions). When allowed,
   * one other piece gets its pattern in a contrasting palette color; everything else stays plain.
   */
  applyPatterns(pieces: OutfitPiece[], palette: Palette, occasion: Occasion, allow: boolean): OutfitPiece[] {
    const festive = ['eid', 'wedding', 'formal', 'iftar'].includes(occasion.id)
    const contrast = (color: string, options: string[]) =>
      options.find((c) => c !== color && this.byId.has(c) && deltaE(this.hex(color), this.hex(c)) > 0.18) ?? 'white'

    let out = pieces.map((p) => {
      if (!p.color || !p.item.patterns?.includes('embroidery') || !p.item.tags.includes('embroidered')) return p
      const patternColor = festive || p.item.formality >= 4 ? 'gold' : contrast(p.color, [palette.accent, palette.secondary])
      return { ...p, pattern: 'embroidery' as Pattern, patternColor }
    })
    if (!allow) return out

    const businesslike = ['work', 'interview', 'university'].includes(occasion.id)
    const order = (p: OutfitPiece) =>
      p.slot === 'top' ? (p.item.fills ? 1 : 0) : p.slot === 'bottom' ? 2 : p.slot === 'outer' ? 3 : p.slot === 'accessory' ? 4 : 9
    const candidate = out
      .filter((p) => p.color && !p.pattern && !p.carry && p.item.patterns?.length && order(p) < 9)
      .sort((a, b) => order(a) - order(b))[0]
    if (!candidate) return out
    const options = candidate.item.patterns!
    const pattern = (businesslike ? options.find((x) => x === 'stripes' || x === 'check') : undefined) ?? options[0]
    const patternColor = contrast(candidate.color!, [palette.accent, palette.secondary, palette.base])
    out = out.map((p) => (p === candidate ? { ...p, pattern, patternColor } : p))
    return out
  }

  /**
   * Describes the colors actually used (the nearest-color fallback can drift from the palette):
   * one color → monochrome; only neutrals → "neutrals"; neutrals + one color → neutral-accent with the color named last.
   */
  explain(named: string[], planned: Strategy): { strategy: Strategy; noteKey: string; colors: string[] } {
    const isChromatic = (id: string) => chroma(this.hex(id)) > 0.035
    const neutrals = named.filter((c) => !isChromatic(c))
    const chromatic = named.filter(isChromatic)
    if (named.length <= 1) return { strategy: 'monochrome', noteKey: 'monochrome', colors: named }
    if (chromatic.length === 0)
      return { strategy: 'neutral-accent', noteKey: neutrals.length >= 3 ? 'neutrals' : 'pair', colors: neutrals.slice(0, 3) }
    if (chromatic.length === 1)
      return neutrals.length >= 2
        ? { strategy: 'neutral-accent', noteKey: 'neutral-accent', colors: [...neutrals.slice(0, 2), chromatic[0]] }
        : { strategy: 'neutral-accent', noteKey: 'pair', colors: [neutrals[0] ?? chromatic[0], chromatic[0]] }
    const strategy: Strategy = planned === 'monochrome' ? 'analogous' : planned
    if (strategy === 'complementary') return { strategy, noteKey: 'complementary', colors: chromatic.slice(0, 2) }
    return { strategy, noteKey: named.length === 2 ? 'pair' : strategy === 'analogous' ? 'analogous' : 'neutral-accent', colors: [...neutrals, ...chromatic].slice(0, 3) }
  }

  private describe(pieces: OutfitPiece[], palette: Palette, sunnyHeat: boolean): PaletteResult {
    const bySwatch = new Map<string, Swatch>()
    for (const p of pieces) {
      if (!p.color || !SWATCH_SLOTS.includes(p.slot)) continue
      const s = bySwatch.get(p.color) ?? { color: p.color, role: rolesFor(p)[0], slots: [] }
      s.slots.push(p.slot)
      bySwatch.set(p.color, s)
    }
    const order: Role[] = ['base', 'secondary', 'accent', 'outer', 'ground']
    const swatches = [...bySwatch.values()].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role)).slice(0, 6)

    const { strategy, noteKey, colors } = this.explain(swatches.filter((s) => !this.byId.get(s.color)?.fixed).map((s) => s.color), palette.strategy)
    const notes: PaletteResult['notes'] = [{ key: noteKey, colors }]
    const hijab = pieces.find((p) => p.slot === 'head' && p.item.tags.includes('hijab'))
    if (hijab?.color) notes.push({ key: 'hijab', colors: [hijab.color] })
    const mainLight = pieces.filter((p) => HEAT_EXPOSED.includes(p.slot) && p.color && lightness(this.hex(p.color)) >= 0.7)
    if (sunnyHeat && mainLight.length >= 2) notes.push({ key: 'light' })
    return { id: palette.id, strategy, swatches, notes }
  }
}

const MAIN: Slot[] = ['top', 'bottom', 'outer', 'mid', 'head', 'shoes']
const SWATCH_SLOTS: Slot[] = ['head', 'outer', 'mid', 'top', 'bottom', 'shoes', 'accessory']
const HEAT_EXPOSED: Slot[] = ['top', 'bottom', 'outer', 'head']

/** Which palette roles a piece takes, best first. */
export function rolesFor(p: OutfitPiece): Role[] {
  const tags = p.item.tags
  switch (p.slot) {
    case 'top':
      return p.item.fills?.includes('bottom') ? ['base', 'secondary', 'accent'] : ['secondary', 'accent', 'base']
    case 'bottom':
      return ['base', 'secondary']
    case 'outer':
      return ['outer', 'base', 'accent']
    case 'mid':
      return ['accent', 'outer', 'base']
    case 'head':
      return tags.includes('hijab') || tags.includes('head-cover') ? ['accent', 'secondary', 'outer'] : ['base', 'ground', 'accent']
    case 'shoes':
      return ['ground', 'base']
    case 'socks':
      return ['base', 'ground']
    case 'accessory':
      // An evening clutch is the finishing accent; everyday bags match the shoes.
      if (tags.includes('bag') && p.item.formality >= 5) return ['accent', 'ground', 'secondary']
      if (tags.includes('bag') || tags.includes('gloves')) return ['ground', 'accent', 'base']
      if (tags.includes('scarf')) return ['accent', 'outer', 'base']
      return ['base', 'accent']
    default:
      return ['ground', 'base']
  }
}
