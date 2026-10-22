/**
 * Personal adjustments from the optional profile details (height, weight, age, "I run cold / hot").
 * They only nudge the suggestions: weather, occasion and modesty rules still come first.
 */
import type { Reason } from './outfit-types'
import type { Gender, Look, Profile, WeatherContext } from './types'

export type AgeGroup = 'teen' | 'young' | 'adult' | 'mature' | 'senior'
export type Build = 'slim' | 'average' | 'full'
export type Stature = 'petite' | 'average' | 'tall'

export const HEIGHT_RANGE = { min: 120, max: 220 } as const
export const WEIGHT_RANGE = { min: 30, max: 200 } as const
export const AGE_RANGE = { min: 10, max: 100 } as const

/** Typical adult height per gender (cm), used for the character's proportions. */
const BASE_HEIGHT: Record<Gender, number> = { male: 175, female: 162 }

const inRange = (n: number | undefined, r: { min: number; max: number }) => n !== undefined && Number.isFinite(n) && n >= r.min && n <= r.max

export function ageGroup(age?: number): AgeGroup | null {
  if (!inRange(age, AGE_RANGE)) return null
  if (age! < 18) return 'teen'
  if (age! <= 30) return 'young'
  if (age! <= 50) return 'adult'
  if (age! <= 65) return 'mature'
  return 'senior'
}

export function bmi(p: Pick<Profile, 'heightCm' | 'weightKg'>): number | null {
  if (!inRange(p.heightCm, HEIGHT_RANGE) || !inRange(p.weightKg, WEIGHT_RANGE)) return null
  const m = p.heightCm! / 100
  return p.weightKg! / (m * m)
}

export function build(p: Pick<Profile, 'heightCm' | 'weightKg'>): Build | null {
  const b = bmi(p)
  if (b === null) return null
  return b < 18.5 ? 'slim' : b >= 27 ? 'full' : 'average'
}

export function stature(p: Pick<Profile, 'heightCm' | 'gender'>): Stature | null {
  if (!inRange(p.heightCm, HEIGHT_RANGE)) return null
  const rel = p.heightCm! / BASE_HEIGHT[p.gender]
  return rel < 0.95 ? 'petite' : rel > 1.05 ? 'tall' : 'average'
}

export interface Personal {
  /** °C the person feels colder (positive) or warmer (negative) than the forecast. */
  offset: number
  /** Tag → score bonus added to the rule preferences. */
  prefer: Record<string, number>
  /** Tags left out altogether (e.g. high heels for people over 65). */
  exclude: string[]
  reasons: Reason[]
}

const AGE_OFFSET: Record<AgeGroup, number> = { teen: -0.5, young: 0, adult: 0, mature: 1, senior: 2.5 }

const AGE_PREFER: Record<AgeGroup, Record<string, number>> = {
  // Younger people: casual, trend-led pieces.
  teen: { sneakers: 1, hood: 1, sporty: 0.5, layer: 0.5, tailored: -1, formal: -0.5 },
  young: { sneakers: 0.5, layer: 0.5 },
  adult: {},
  // Older people: comfortable shoes, classic cuts, a warmer layer.
  mature: { heels: -1, 'slip-on': 0.5, sporty: -0.5 },
  senior: { 'slip-on': 1, closed: 0.5, grip: 1, warm: 1, sporty: -1, shorts: -1.5, hood: -0.5 },
}

const BUILD_PREFER: Record<Build, Record<string, number>> = {
  slim: { layer: 0.5 },
  average: {},
  full: { loose: 1.5, flowy: 0.5, breathable: 0.5, 'long-top': 0.5, fitted: -1.5 },
}

/** Modern looks lean relaxed and layered; classic looks lean tailored and collared. */
const LOOK_PREFER: Record<Look, Record<string, number>> = {
  classic: { collared: 0.3, tailored: 0.3, leather: 0.3 },
  modern: { loose: 0.5, sneakers: 0.5, layer: 0.5 },
  minimal: { tailored: 0.3, embroidered: -1 },
}

const STATURE_PREFER: Record<Stature, Record<string, number>> = {
  petite: { long: -0.5 },
  average: {},
  tall: { long: 0.5 },
}

function addAll(into: Record<string, number>, from: Record<string, number>) {
  for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v
}

export function personalize(p: Profile): Personal {
  const prefer: Record<string, number> = {}
  const reasons: Reason[] = []
  const exclude: string[] = []
  const age = ageGroup(p.age)
  const body = build(p)
  const height = stature(p)

  const thermal = p.thermal === 'cold' ? 2.5 : p.thermal === 'hot' ? -2.5 : 0
  const ageOffset = age ? AGE_OFFSET[age] : 0
  const offset = thermal + ageOffset

  if (age) addAll(prefer, AGE_PREFER[age])
  if (age === 'senior') exclude.push('heels')
  if (body) addAll(prefer, BUILD_PREFER[body])
  if (height) addAll(prefer, STATURE_PREFER[height])
  if (p.look) addAll(prefer, LOOK_PREFER[p.look])

  if (p.thermal === 'cold') reasons.push({ key: 'personalCold' })
  else if (p.thermal === 'hot') reasons.push({ key: 'personalHot' })
  if (age === 'senior' || age === 'mature') reasons.push({ key: 'personalAge' })
  if (body === 'full') reasons.push({ key: 'personalFit' })

  return { offset, prefer, exclude, reasons }
}

/** The weather as this person feels it: every feels-like value shifted by the personal offset. */
export function feltContext(ctx: WeatherContext, offset: number): WeatherContext {
  if (!offset) return ctx
  return {
    ...ctx,
    feelsNow: ctx.feelsNow - offset,
    feelsMin: ctx.feelsMin - offset,
    feelsMax: ctx.feelsMax - offset,
    feelsAvg: ctx.feelsAvg - offset,
    shadeMin: ctx.shadeMin - offset,
    sunFeels: ctx.sunFeels - offset,
    shadeFeels: ctx.shadeFeels - offset,
  }
}

/** Character proportions: vertical scale from height, horizontal from build. */
export function figureScale(p: Profile): { sx: number; sy: number } {
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
  const sy = inRange(p.heightCm, HEIGHT_RANGE) ? clamp(p.heightCm! / BASE_HEIGHT[p.gender], 0.86, 1.08) : 1
  const b = bmi(p)
  const sx = b === null ? 1 : clamp(1 + (b - 22.5) * 0.028, 0.88, 1.3)
  return { sx: Math.round(sx * 100) / 100, sy: Math.round(sy * 100) / 100 }
}
