import type { ClimateZone, Condition, DustLevel, Forecast, HourPoint, TempBand, WeatherContext } from './types'
import { hoursBetween } from './time'

/** Feels-like °C upper bounds for each band. */
const BANDS: Array<[TempBand, number]> = [
  ['freezing', 3],
  ['cold', 10],
  ['cool', 16],
  ['mild', 22],
  ['warm', 28],
  ['hot', 34],
  ['extreme', Infinity],
]

export function bandOf(feels: number): TempBand {
  return BANDS.find(([, max]) => feels < max)![0]
}

const CONDITION_ORDER: Condition[] = ['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'thunder']

/** Maps a WMO weather code to a simple condition. */
export function conditionOf(code: number): Condition {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunder'
  return 'cloudy'
}

/** Dust concentration (µg/m³, CAMS surface dust) to a level. */
export function dustLevelOf(maxDust: number | null, minVisibility: number | null, maxGust: number): DustLevel | null {
  if (maxDust === null) return null
  let level: DustLevel = maxDust >= 400 ? 'severe' : maxDust >= 100 ? 'moderate' : 'none'
  // Strong gusts with poor visibility turn a dusty day into a sandstorm.
  if (level === 'moderate' && minVisibility !== null && minVisibility < 2000 && maxGust >= 45) level = 'severe'
  return level
}

/** The forecast hours covering [start, start + hours). Empty if the start is outside the forecast. */
export function sliceStay(forecast: Forecast, start: string, hours: number): HourPoint[] {
  const first = forecast.hours[0]
  if (!first) return []
  const offset = Math.max(0, hoursBetween(first.time, start))
  return forecast.hours.slice(offset, offset + Math.max(1, hours))
}

const round1 = (n: number) => Math.round(n * 10) / 10
const max = (xs: number[]) => Math.max(...xs)
const min = (xs: number[]) => Math.min(...xs)
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function buildContext(
  forecast: Forecast,
  zone: ClimateZone,
  start: string,
  hours: number,
): WeatherContext | null {
  const stay = sliceStay(forecast, start, hours)
  if (stay.length === 0) return null

  const feels = stay.map((h) => h.feels)
  const feelsMin = min(feels)
  const feelsMax = max(feels)
  const feelsAvg = sum(feels) / feels.length
  const gust = max(stay.map((h) => h.gust))

  const dusts = stay.map((h) => h.dust).filter((d): d is number => d !== null)
  const visibilities = stay.map((h) => h.visibility).filter((v): v is number => v !== null)

  const condition = stay
    .map((h) => conditionOf(h.code))
    .reduce((worst, c) => (CONDITION_ORDER.indexOf(c) > CONDITION_ORDER.indexOf(worst) ? c : worst), 'clear' as Condition)

  const day = stay.filter((h) => h.isDay).map((h) => h.feels)
  const night = stay.filter((h) => !h.isDay).map((h) => h.feels)
  const coolsAfterDark = day.length > 0 && night.length > 0 && max(day) - min(night) >= 6

  return {
    start: stay[0].time,
    end: stay[stay.length - 1].time,
    hours: stay.length,
    zone,
    tempNow: round1(stay[0].temp),
    feelsNow: round1(stay[0].feels),
    feelsMin: round1(feelsMin),
    feelsMax: round1(feelsMax),
    feelsAvg: round1(feelsAvg),
    tempMin: round1(min(stay.map((h) => h.temp))),
    tempMax: round1(max(stay.map((h) => h.temp))),
    swing: round1(feelsMax - feelsMin),
    band: bandOf(feelsAvg),
    coldBand: bandOf(feelsMin),
    rainProb: max(stay.map((h) => h.precipProb)),
    precipMm: round1(sum(stay.map((h) => h.precip))),
    snowCm: round1(sum(stay.map((h) => h.snow))),
    wind: Math.round(max(stay.map((h) => h.wind))),
    gust: Math.round(gust),
    humidity: Math.round(sum(stay.map((h) => h.humidity)) / stay.length),
    uvMax: round1(max(stay.map((h) => h.uv))),
    dust: dustLevelOf(dusts.length ? max(dusts) : null, visibilities.length ? min(visibilities) : null, gust),
    condition,
    isNight: !stay[0].isDay,
    coolsAfterDark,
  }
}
