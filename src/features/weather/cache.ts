import { del, get, keys, set } from 'idb-keyval'
import type { Forecast, Place } from '@/engine/types'
import { ammanNow, dateOf } from '@/engine/time'
import { FORECAST_DAYS, fetchForecast, forecastKey } from './api'
import { typicalForecast } from './climate'

/** Saved forecasts younger than this are not refetched. */
export const FRESH_MS = 30 * 60 * 1000

export interface ForecastResult {
  forecast: Forecast
  /** True when the network failed and we're showing saved or typical-weather data. */
  offline: boolean
}

export class WeatherUnavailableError extends Error {
  constructor(readonly offline: boolean) {
    super(offline ? 'offline' : 'weather-failed')
  }
}

// v2: forecasts include wind direction, cloud, dew point, radiation, freezing level and snow depth.
const storeKey = (key: string) => `clothup.forecast.v2.${key}`

/** Removes forecasts saved in an older format (and anything that no longer covers today). */
export async function cleanupOldForecasts(): Promise<void> {
  try {
    const today = `${dateOf(ammanNow())}T00:00`
    for (const k of await keys()) {
      if (typeof k !== 'string' || !k.startsWith('clothup.forecast.')) continue
      if (!k.startsWith('clothup.forecast.v2.')) {
        await del(k)
        continue
      }
      const f = await get<Forecast>(k)
      if (!f || !f.hours.some((h) => h.time >= today)) await del(k)
    }
  } catch {
    /* storage unavailable: nothing to clean */
  }
}

/** A saved forecast is still useful while it covers the current hour. */
function coversNow(f: Forecast): boolean {
  const now = ammanNow()
  return f.hours.some((h) => h.time >= now)
}

/** The saved forecast for a place, if it still covers now (instant, no network). */
export async function readCachedForecast(place: Place): Promise<Forecast | undefined> {
  try {
    const f = await get<Forecast>(storeKey(forecastKey(place)))
    return f && coversNow(f) ? f : undefined
  } catch {
    return undefined
  }
}

export const isFresh = (f: Forecast) => Date.now() - f.fetchedAt < FRESH_MS

/** Typical weather for the next 16 days, from monthly climate averages. */
function typical(place: Place): Forecast | null {
  return typicalForecast(place, `${dateOf(ammanNow())}T00:00`, FORECAST_DAYS * 24)
}

/**
 * Fetches a fresh forecast and saves it. If the network fails, falls back to the saved forecast,
 * then to typical weather for the month; only throws when neither exists.
 */
export async function getForecast(place: Place, opts: { force?: boolean; signal?: AbortSignal } = {}): Promise<ForecastResult> {
  const cached = await readCachedForecast(place)
  if (cached && !opts.force && isFresh(cached)) return { forecast: cached, offline: false }

  try {
    const forecast = await fetchForecast(place, opts.signal)
    set(storeKey(forecast.key), forecast).catch(() => {})
    return { forecast, offline: false }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    if (cached) return { forecast: cached, offline: true }
    const fallback = typical(place)
    if (fallback) return { forecast: fallback, offline: true }
    throw new WeatherUnavailableError(typeof navigator !== 'undefined' && navigator.onLine === false)
  }
}
