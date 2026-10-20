import { get, set } from 'idb-keyval'
import type { Forecast, Place } from '@/engine/types'
import { ammanNow } from '@/engine/time'
import { fetchForecast, forecastKey } from './api'

/** Forecasts younger than this are used without hitting the network. */
export const FRESH_MS = 60 * 60 * 1000

export interface ForecastResult {
  forecast: Forecast
  /** True when the network failed and we're showing older cached data. */
  offline: boolean
}

export class WeatherUnavailableError extends Error {
  constructor(readonly offline: boolean) {
    super(offline ? 'offline' : 'weather-failed')
  }
}

const storeKey = (key: string) => `clothup.forecast.${key}`

async function readCache(key: string): Promise<Forecast | undefined> {
  try {
    return await get<Forecast>(storeKey(key))
  } catch {
    return undefined
  }
}

/** A cached forecast is still useful offline while it covers the current hour. */
function coversNow(f: Forecast): boolean {
  const now = ammanNow()
  return f.hours.some((h) => h.time >= now)
}

export async function getForecast(place: Place, opts: { force?: boolean; signal?: AbortSignal } = {}): Promise<ForecastResult> {
  const key = forecastKey(place)
  const cached = await readCache(key)

  if (cached && !opts.force && Date.now() - cached.fetchedAt < FRESH_MS) {
    return { forecast: cached, offline: false }
  }

  try {
    const forecast = await fetchForecast(place, opts.signal)
    set(storeKey(key), forecast).catch(() => {})
    return { forecast, offline: false }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    if (cached && coversNow(cached)) return { forecast: cached, offline: true }
    throw new WeatherUnavailableError(typeof navigator !== 'undefined' && navigator.onLine === false)
  }
}
