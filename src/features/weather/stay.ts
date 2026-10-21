import type { Forecast, Place, WeatherContext } from '@/engine/types'
import { buildContext } from '@/engine/context'
import { typicalForecast } from './climate'

/** The weather for a stay; beyond the 16-day forecast (or without one), typical weather for that month. */
export function stayContext(forecast: Forecast | null, place: Place, start: string, hours: number): WeatherContext | null {
  const real = forecast ? buildContext(forecast, place.zone, start, hours) : null
  if (real) return real
  const typical = typicalForecast(place, start, hours)
  return typical ? buildContext(typical, place.zone, start, hours) : null
}
