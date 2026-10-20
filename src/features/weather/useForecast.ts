import { useCallback, useEffect, useState } from 'react'
import type { Forecast, Place } from '@/engine/types'
import { getForecast, isFresh, readCachedForecast, WeatherUnavailableError } from './cache'

export type ForecastState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; forecast: Forecast; offline: boolean; refreshing?: boolean }
  | { status: 'error'; offline: boolean }

export function useForecast(place: Place | null) {
  const [state, setState] = useState<ForecastState>({ status: place ? 'loading' : 'idle' })
  const [nonce, setNonce] = useState(0)
  const [prevPlace, setPrevPlace] = useState(place)
  const placeKey = place ? `${place.id}:${place.lat}:${place.lon}` : null

  // Reset to loading during render when the place changes (avoids a flash of the old place's weather).
  if (place !== prevPlace) {
    setPrevPlace(place)
    setState({ status: place ? 'loading' : 'idle' })
  }

  useEffect(() => {
    if (!place) return
    const ctrl = new AbortController()
    let showedCached = false
    // Show the saved forecast straight away, then refresh it in the background if it's old.
    void readCachedForecast(place).then((cached) => {
      if (!cached || ctrl.signal.aborted) return
      showedCached = true
      setState((s) => (s.status === 'ready' ? s : { status: 'ready', forecast: cached, offline: false, refreshing: !isFresh(cached) }))
    })
    getForecast(place, { force: nonce > 0, signal: ctrl.signal })
      .then((r) => setState({ status: 'ready', forecast: r.forecast, offline: r.offline, refreshing: false }))
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return
        if (showedCached) return setState((s) => (s.status === 'ready' ? { ...s, offline: true, refreshing: false } : s))
        setState({ status: 'error', offline: err instanceof WeatherUnavailableError && err.offline })
      })
    return () => ctrl.abort()
    // placeKey captures the place identity; nonce triggers manual refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey, nonce])

  const refresh = useCallback(() => {
    setState({ status: 'loading' })
    setNonce((n) => n + 1)
  }, [])

  return { state, refresh }
}
