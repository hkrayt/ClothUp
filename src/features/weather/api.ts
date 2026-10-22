import type { Forecast, HourPoint, Place } from '@/engine/types'
import { AMMAN_TZ } from '@/engine/time'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'

const HOURLY = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation_probability',
  'precipitation',
  'snowfall',
  'weather_code',
  'wind_speed_10m',
  'wind_gusts_10m',
  'uv_index',
  'is_day',
  'visibility',
  'wind_direction_10m',
  'cloud_cover',
  'dew_point_2m',
  'shortwave_radiation',
  'freezing_level_height',
  'snow_depth',
] as const

/** Days of forecast requested (Open-Meteo's maximum). */
export const FORECAST_DAYS = 16
/** Beyond this many days ahead the forecast is shown as less certain. */
export const RELIABLE_DAYS = 7

type Hourly = Record<(typeof HOURLY)[number], Array<number | null>> & { time: string[] }

interface ForecastResponse {
  latitude: number
  longitude: number
  elevation: number
  hourly: Hourly
}

interface AirResponse {
  hourly: { time: string[]; dust: Array<number | null> }
}

export function forecastKey(place: Pick<Place, 'id' | 'lat' | 'lon'>): string {
  return place.id === 'current' ? `geo:${place.lat.toFixed(2)},${place.lon.toFixed(2)}` : place.id
}

function query(params: Record<string, string | number | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
}

async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

const num = (v: number | null | undefined, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

/** Fetches hourly weather plus dust for a place. Dust is optional: if that API fails we carry on without it. */
export async function fetchForecast(place: Place, signal?: AbortSignal): Promise<Forecast> {
  // The user's own location is sent rounded to about 1 km; that's plenty for a forecast.
  const coord = (n: number) => (place.id === 'current' ? Math.round(n * 100) / 100 : n)
  const common = { latitude: coord(place.lat), longitude: coord(place.lon), timezone: AMMAN_TZ }

  const [weather, air] = await Promise.all([
    getJSON<ForecastResponse>(
      `${FORECAST_URL}?${query({ ...common, elevation: place.elevation, hourly: HOURLY.join(','), forecast_days: FORECAST_DAYS })}`,
      signal,
    ),
    getJSON<AirResponse>(`${AIR_URL}?${query({ ...common, hourly: 'dust', forecast_days: 5 })}`, signal).catch(
      () => null,
    ),
  ])

  const dustByTime = new Map<string, number | null>()
  air?.hourly.time.forEach((t, i) => dustByTime.set(t, air.hourly.dust[i] ?? null))

  const h = weather.hourly
  const hours: HourPoint[] = h.time.map((time, i) => ({
    time,
    temp: num(h.temperature_2m[i]),
    feels: num(h.apparent_temperature[i], num(h.temperature_2m[i])),
    humidity: num(h.relative_humidity_2m[i]),
    precipProb: num(h.precipitation_probability[i]),
    precip: num(h.precipitation[i]),
    snow: num(h.snowfall[i]),
    code: num(h.weather_code[i]),
    wind: num(h.wind_speed_10m[i]),
    gust: num(h.wind_gusts_10m[i]),
    uv: num(h.uv_index[i]),
    isDay: h.is_day[i] === 1,
    visibility: h.visibility[i] ?? null,
    dust: dustByTime.get(time) ?? null,
    windDir: h.wind_direction_10m[i] ?? null,
    cloud: h.cloud_cover[i] ?? null,
    dewPoint: h.dew_point_2m[i] ?? null,
    radiation: h.shortwave_radiation[i] ?? null,
    freezingLevel: h.freezing_level_height[i] ?? null,
    snowDepth: h.snow_depth[i] ?? null,
  }))
    // The last hours of the 16th day can be empty.
    .filter((_, i) => h.temperature_2m[i] !== null)

  return {
    key: forecastKey(place),
    lat: weather.latitude,
    lon: weather.longitude,
    elevation: weather.elevation,
    source: 'forecast',
    fetchedAt: Date.now(),
    hours,
  }
}
