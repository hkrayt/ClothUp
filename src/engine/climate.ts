import type { Forecast, HourPoint, Place } from './types'
import { addHours, hourOf } from './time'

/** Per month: [tMax, tMin, feelsMax, feelsMin, rainDayShare 0–1, precipMm, windMaxKmh, humidity%]. */
export type ClimateMonth = [number, number, number, number, number, number, number, number]

export interface ClimateData {
  source: string
  places: Record<string, ClimateMonth[]>
}

/** Typical clear-sky midday UV index in Jordan by month. */
const UV_BY_MONTH = [3, 4, 6, 8, 9, 10, 11, 10, 8, 6, 4, 3]

/** 0 at the coldest hour (~5 AM), 1 at the warmest (~2 PM). */
export function diurnal(hour: number): number {
  const h = hour < 5 ? hour + 24 : hour
  if (h <= 14) return (1 - Math.cos((Math.PI * (h - 5)) / 9)) / 2
  return (1 + Math.cos((Math.PI * (h - 14)) / 15)) / 2
}

function daylight(month: number, hour: number): boolean {
  const summer = month >= 3 && month <= 8 // April–September
  return hour >= (summer ? 5 : 6) && hour < (summer ? 19 : 17)
}

/**
 * A "typical day" forecast built from monthly averages, used when there's no real forecast:
 * offline with nothing cached, or for dates beyond the 16-day forecast.
 */
export function climateForecast(place: Place, climateId: string, data: ClimateData, start: string, hours: number): Forecast | null {
  const months = data.places[climateId]
  if (!months) return null
  const first = `${start.slice(0, 10)}T00:00`
  const count = Math.max(24, hourOf(start) + hours + 1)
  const out: HourPoint[] = []
  for (let i = 0; i < count; i++) {
    const time = addHours(first, i)
    const month = Number(time.slice(5, 7)) - 1
    const [tMax, tMin, fMax, fMin, rainShare, , windMax, humidity] = months[month]
    const hour = hourOf(time)
    const k = diurnal(hour)
    const day = daylight(month, hour)
    out.push({
      time,
      temp: tMin + (tMax - tMin) * k,
      feels: fMin + (fMax - fMin) * k,
      humidity,
      precipProb: Math.round(rainShare * 100),
      precip: 0,
      snow: 0,
      code: rainShare >= 0.25 ? 3 : 1,
      wind: windMax * (0.4 + 0.3 * k),
      gust: windMax * (0.6 + 0.5 * k),
      uv: day ? UV_BY_MONTH[month] * Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12)) : 0,
      isDay: day,
      visibility: null,
      dust: null,
    })
  }
  return {
    key: `climate:${climateId}`,
    lat: place.lat,
    lon: place.lon,
    elevation: place.elevation ?? 0,
    fetchedAt: Date.now(),
    hours: out,
    source: 'climate',
  }
}
