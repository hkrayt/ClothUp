import climateData from '@/data/climate.json'
import { climateForecast, type ClimateData } from '@/engine/climate'
import type { Forecast, Place } from '@/engine/types'
import { nearestPlace } from '@/features/places/places'

const CLIMATE = climateData as unknown as ClimateData

/** Typical-weather forecast for a place (the current location uses the nearest known place). */
export function typicalForecast(place: Place, start: string, hours: number): Forecast | null {
  const id = place.id === 'current' ? nearestPlace(place.lat, place.lon).place.id : place.id
  return climateForecast(place, id, CLIMATE, start, hours)
}
