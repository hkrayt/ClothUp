import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

export type GeoError = 'denied' | 'unavailable'

export interface Coords {
  lat: number
  lon: number
}

/** Coarse device location. Rejects with 'denied' or 'unavailable'. */
export async function getCurrentCoords(): Promise<Coords> {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await Geolocation.requestPermissions({ permissions: ['coarseLocation'] })
      if (perm.coarseLocation === 'denied') throw 'denied' satisfies GeoError
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 })
      return { lat: pos.coords.latitude, lon: pos.coords.longitude }
    } catch (e) {
      throw e === 'denied' ? e : ('unavailable' satisfies GeoError)
    }
  }

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject('unavailable' satisfies GeoError)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject((err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable') satisfies GeoError),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    )
  })
}
