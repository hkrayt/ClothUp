import type { Forecast, HourPoint } from './types'
import { addHours } from './time'

/** Builds a synthetic forecast for tests. `overrides(i, hourOfDay)` customizes each hour. */
export function makeForecast(
  start: string,
  count: number,
  overrides: (i: number, hour: number) => Partial<HourPoint> = () => ({}),
): Forecast {
  const hours: HourPoint[] = Array.from({ length: count }, (_, i) => {
    const time = addHours(start, i)
    const hour = Number(time.slice(11, 13))
    return {
      time,
      temp: 20,
      feels: 20,
      humidity: 40,
      precipProb: 0,
      precip: 0,
      snow: 0,
      code: 0,
      wind: 10,
      gust: 15,
      uv: hour >= 7 && hour <= 17 ? 5 : 0,
      isDay: hour >= 6 && hour < 18,
      visibility: 30000,
      dust: 0,
      ...overrides(i, hour),
    }
  })
  return { key: 'test', lat: 31.95, lon: 35.94, elevation: 757, fetchedAt: Date.now(), hours }
}
