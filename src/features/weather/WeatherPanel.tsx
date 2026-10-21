import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudOff } from 'lucide-react'
import type { Place, WeatherContext } from '@/engine/types'
import { Button, Card } from '@/ui'
import { useForecast } from './useForecast'
import { stayContext } from './stay'
import { WeatherCard, WeatherCardSkeleton } from './WeatherCard'

interface WeatherPanelProps {
  place: Place
  start: string
  hours: number
  children?: (ctx: WeatherContext) => React.ReactNode
}

/** Loads the forecast for a place and shows the weather card (plus anything that depends on the context). */
export function WeatherPanel({ place, start, hours, children }: WeatherPanelProps) {
  const { t } = useTranslation()
  const { state, refresh } = useForecast(place)
  const forecast = state.status === 'ready' ? state.forecast : null
  const ctx = useMemo(() => (forecast ? stayContext(forecast, place, start, hours) : null), [forecast, place, start, hours])

  if (state.status === 'loading' || state.status === 'idle') return <WeatherCardSkeleton />

  if (state.status === 'error') {
    return (
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <CloudOff size={40} className="text-muted" aria-hidden />
        <p>{state.offline ? t('weather.errorOffline') : t('weather.error')}</p>
        <Button variant="secondary" onClick={refresh}>
          {t('common.retry')}
        </Button>
      </Card>
    )
  }

  if (!ctx) {
    return (
      <Card className="py-8 text-center">
        <p>{t('weather.outOfRange')}</p>
      </Card>
    )
  }

  return (
    <>
      <WeatherCard
        place={place}
        ctx={ctx}
        fetchedAt={state.forecast.fetchedAt}
        offline={state.offline && ctx.source !== 'climate'}
        refreshing={state.refreshing}
        onRefresh={refresh}
      />
      {children?.(ctx)}
    </>
  )
}
