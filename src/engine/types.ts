/** Shared domain types. The engine is pure TypeScript and never imports UI code. */

export type Lang = 'en' | 'ar'
export type Localized = Record<Lang, string>

export type ClimateZone =
  | 'highland'
  | 'northern-highland'
  | 'highland-desert'
  | 'steppe'
  | 'desert'
  | 'rift-valley'
  | 'red-sea'

export interface Place {
  id: string
  name: Localized
  lat: number
  lon: number
  /**
   * Metres above sea level; passed to the weather API so the Dead Sea isn't modelled at hill height.
   * Omitted for the device's current location (the API then uses its own terrain model).
   */
  elevation?: number
  zone: ClimateZone
  aliases: string[]
}

export type Gender = 'male' | 'female'
/** Male: standard | traditional. Female: standard | modest. */
export type Style = 'standard' | 'modest' | 'traditional'

export interface Profile {
  gender: Gender
  style: Style
  /** Index into the character's skin tone list (0–4). */
  skinTone: number
}

export type OccasionId =
  | 'work'
  | 'casual'
  | 'formal'
  | 'university'
  | 'gym'
  | 'hiking'
  | 'religious'
  | 'wedding'
  | 'travel'

export type Mood = 'classic' | 'muted' | 'fresh' | 'bright' | 'earthy'

export interface Occasion {
  id: OccasionId
  icon: string
  /** Acceptable formality range, 0 (sporty) – 5 (black tie). */
  formality: [number, number]
  /** Color moods that suit the occasion, best first. */
  moods: Mood[]
}

export type When = { kind: 'now' } | { kind: 'at'; time: string }
/** Hours at the place, or 'night' = until about 1 AM. */
export type Duration = 2 | 3 | 6 | 10 | 'night'

/** One forecast hour, in Amman local time. */
export interface HourPoint {
  /** Local time, "YYYY-MM-DDTHH:00" (Asia/Amman). */
  time: string
  temp: number
  feels: number
  humidity: number
  precipProb: number
  precip: number
  snow: number
  code: number
  wind: number
  gust: number
  uv: number
  isDay: boolean
  visibility: number | null
  dust: number | null
}

export interface Forecast {
  key: string
  lat: number
  lon: number
  elevation: number
  fetchedAt: number
  hours: HourPoint[]
}

export type TempBand = 'freezing' | 'cold' | 'cool' | 'mild' | 'warm' | 'hot' | 'extreme'
export type DustLevel = 'none' | 'moderate' | 'severe'
export type Condition = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder'

/** Weather summarized over the whole time the user will spend at the place. */
export interface WeatherContext {
  start: string
  end: string
  hours: number
  zone: ClimateZone
  tempNow: number
  feelsNow: number
  feelsMin: number
  feelsMax: number
  feelsAvg: number
  tempMin: number
  tempMax: number
  /** Feels-like difference between the warmest and coldest hour of the stay. */
  swing: number
  band: TempBand
  coldBand: TempBand
  rainProb: number
  precipMm: number
  snowCm: number
  wind: number
  gust: number
  humidity: number
  uvMax: number
  dust: DustLevel | null
  condition: Condition
  isNight: boolean
  /** True when the stay runs into the evening/night and feels-like drops noticeably. */
  coolsAfterDark: boolean
}
