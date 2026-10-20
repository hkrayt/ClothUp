import type { ClimateZone, DustLevel, WeatherContext } from './types'
import { bandOf } from './context'

/** Hand-built weather contexts for tests and tuning, named after real Jordan situations. */
export function scenario(over: Partial<WeatherContext> & { feelsMin: number; feelsMax: number }): WeatherContext {
  const feelsAvg = over.feelsAvg ?? (over.feelsMin + over.feelsMax) / 2
  return {
    start: '2026-10-20T10:00',
    end: '2026-10-20T13:00',
    hours: 3,
    zone: 'highland' as ClimateZone,
    tempNow: feelsAvg,
    feelsNow: feelsAvg,
    feelsAvg,
    tempMin: over.feelsMin,
    tempMax: over.feelsMax,
    swing: over.feelsMax - over.feelsMin,
    band: bandOf(feelsAvg),
    coldBand: bandOf(over.feelsMin),
    rainProb: 0,
    precipMm: 0,
    snowCm: 0,
    wind: 10,
    gust: 18,
    humidity: 40,
    uvMax: 4,
    dust: 'none' as DustLevel,
    condition: 'clear',
    isNight: false,
    coolsAfterDark: false,
    shadeMin: over.feelsMin,
    sunGap: 0,
    sunFeels: feelsAvg,
    shadeFeels: feelsAvg,
    fog: false,
    windDir: null,
    dryWind: false,
    dewPointMax: null,
    snowOnGround: false,
    freezingNear: false,
    series: [],
    lessCertain: false,
    source: 'forecast',
    ...over,
  }
}

export const SCENARIOS = {
  ammanWinterRain: scenario({ feelsMin: 3, feelsMax: 9, rainProb: 80, precipMm: 4, gust: 35, uvMax: 2, condition: 'rain' }),
  ammanSnow: scenario({ feelsMin: -4, feelsMax: 1, snowCm: 3, gust: 30, uvMax: 1, condition: 'snow' }),
  ammanSpring: scenario({ feelsMin: 16, feelsMax: 22, uvMax: 7 }),
  ammanAutumnEvening: scenario({ feelsMin: 13, feelsMax: 24, feelsAvg: 20, coolsAfterDark: true, uvMax: 5 }),
  aqabaSummer: scenario({ feelsMin: 36, feelsMax: 43, humidity: 55, uvMax: 10, zone: 'red-sea' }),
  deadSeaSpring: scenario({ feelsMin: 27, feelsMax: 33, humidity: 60, uvMax: 9, zone: 'rift-valley' }),
  wadiRumNight: scenario({ feelsMin: 6, feelsMax: 28, feelsAvg: 17, coolsAfterDark: true, uvMax: 9, zone: 'desert' }),
  sandstorm: scenario({ feelsMin: 26, feelsMax: 32, dust: 'severe', gust: 60, uvMax: 6, zone: 'desert' }),
  mildCloudy: scenario({ feelsMin: 18, feelsMax: 23, uvMax: 3, condition: 'cloudy' }),
  wadiRumWinterSun: scenario({ feelsMin: 19, feelsMax: 23, shadeMin: 13, sunGap: 8, sunFeels: 22, shadeFeels: 14, uvMax: 5, zone: 'desert' }),
  irbidFog: scenario({ feelsMin: 6, feelsMax: 10, fog: true, condition: 'fog', humidity: 95, uvMax: 1, zone: 'northern-highland' }),
  karakSnowGround: scenario({ feelsMin: -2, feelsMax: 4, snowOnGround: true, uvMax: 3, zone: 'highland' }),
  sharqiya: scenario({ feelsMin: 30, feelsMax: 36, dryWind: true, humidity: 12, wind: 30, gust: 45, windDir: 110, uvMax: 8, zone: 'steppe' }),
}
