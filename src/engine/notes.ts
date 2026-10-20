import type { WeatherContext } from './types'

export interface WeatherNote {
  /** i18n key under "weather.notes". */
  key: string
  params?: Record<string, number>
  tone: 'info' | 'warn'
}

export type UvLevel = 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme'

export function uvLevel(uv: number): UvLevel {
  if (uv < 3) return 'low'
  if (uv < 6) return 'moderate'
  if (uv < 8) return 'high'
  if (uv < 11) return 'veryHigh'
  return 'extreme'
}

/** Short, plain-language warnings shown under the weather card (most important first, max 3). */
export function weatherNotes(ctx: WeatherContext): WeatherNote[] {
  const notes: WeatherNote[] = []
  const min = Math.round(ctx.feelsMin)
  const max = Math.round(ctx.feelsMax)

  if (ctx.dust === 'severe') notes.push({ key: 'sandstorm', tone: 'warn' })
  else if (ctx.dust === 'moderate') notes.push({ key: 'dusty', tone: 'warn' })

  if (ctx.snowCm > 0) notes.push({ key: 'snow', tone: 'warn' })
  else if (ctx.rainProb >= 50) notes.push({ key: 'rain', params: { p: ctx.rainProb }, tone: 'warn' })

  if (ctx.gust >= 50) notes.push({ key: 'gusts', params: { gust: ctx.gust }, tone: 'warn' })

  if (ctx.coolsAfterDark) notes.push({ key: 'coolsAfterDark', params: { min }, tone: 'info' })
  else if (ctx.swing >= 10) notes.push({ key: 'swing', params: { min, max }, tone: 'info' })

  if (ctx.feelsMax >= 28 && ctx.humidity >= 55) notes.push({ key: 'humid', tone: 'info' })
  if (ctx.uvMax >= 8) notes.push({ key: 'uv', tone: 'warn' })
  if (ctx.feelsMax >= 38) notes.push({ key: 'extremeHeat', tone: 'warn' })
  if (ctx.feelsMin <= 0 && ctx.snowCm === 0) notes.push({ key: 'freezing', tone: 'warn' })

  return notes.slice(0, 3)
}
