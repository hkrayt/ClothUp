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

export type PlaceType = 'city' | 'town' | 'neighbourhood' | 'tourist' | 'campus' | 'transport'

export type Governorate =
  | 'amman'
  | 'zarqa'
  | 'irbid'
  | 'balqa'
  | 'madaba'
  | 'jerash'
  | 'ajloun'
  | 'mafraq'
  | 'karak'
  | 'tafilah'
  | 'maan'
  | 'aqaba'

export interface Place {
  id: string
  name: Localized
  /** Missing only for the device's current location. */
  type?: PlaceType
  governorate?: Governorate
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
  | 'beach'
  | 'condolence'
  | 'friday'
  | 'interview'
  | 'dinner'
  | 'eid'
  | 'iftar'
  | 'shopping'

/** 'somber' = dark, quiet colors (condolence visits). */
export type Mood = 'classic' | 'muted' | 'fresh' | 'bright' | 'earthy' | 'somber'

export interface Occasion {
  id: OccasionId
  icon: string
  /** Acceptable formality range, 0 (sporty) – 5 (black tie). */
  formality: [number, number]
  /** Color moods that suit the occasion, best first. */
  moods: Mood[]
  /** 0 = outdoors, 1 = fully indoors. Blends clothing targets toward room temperature. */
  indoor?: number
  /** Items made for these occasions also work here (e.g. casual clothes on a cool beach day). */
  includes?: OccasionId[]
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
  /** Degrees the wind blows from (0 = north, 90 = east). */
  windDir?: number | null
  /** Cloud cover, %. */
  cloud?: number | null
  /** °C. */
  dewPoint?: number | null
  /** Solar radiation on a flat surface, W/m². */
  radiation?: number | null
  /** Height of the 0 °C level above sea level, m. */
  freezingLevel?: number | null
  /** Snow on the ground, m. */
  snowDepth?: number | null
}

export interface Forecast {
  key: string
  lat: number
  lon: number
  elevation: number
  fetchedAt: number
  hours: HourPoint[]
  /** 'climate' = built from monthly averages because no forecast was available. */
  source?: 'forecast' | 'climate'
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
  /** Coldest feels-like out of the sun (equals feelsMin when there's no sunshine data). */
  shadeMin: number
  /** Largest sun-vs-shade difference during daylight, °C. */
  sunGap: number
  /** Feels-like in the sun and in the shade at that hour. */
  sunFeels: number
  shadeFeels: number
  /** Visibility under 1 km at some point (or a fog weather code). */
  fog: boolean
  /** Direction of the strongest wind, degrees (null without data). */
  windDir: number | null
  /** Hot, very dry east/south-east desert wind ("sharqiya"). */
  dryWind: boolean
  /** Highest dew point, °C (null without data). */
  dewPointMax: number | null
  /** Snow already lying on the ground. */
  snowOnGround: boolean
  /** Freezing level close to the ground: precipitation could fall as snow. */
  freezingNear: boolean
  /** Hour-by-hour values for the stay (for the chart). */
  series: Array<{ time: string; feels: number; precipProb: number; isDay: boolean }>
  /** True when the forecast is for more than a week ahead, or is climate-based. */
  lessCertain: boolean
  source: 'forecast' | 'climate'
}
