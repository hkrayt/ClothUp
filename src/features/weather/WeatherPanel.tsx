import { useTranslation } from 'react-i18next'
import { CloudOff } from 'lucide-react'
import type { Place, WeatherContext } from '@/engine/types'
import { buildContext } from '@/engine/context'
import { Button, Card } from '@/ui'
import { useForecast } from './useForecast'
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

  const ctx = buildContext(state.forecast, place.zone, start, hours)
  if (!ctx) {
    return (
      <Card className="py-8 text-center">
        <p>{t('weather.outOfRange')}</p>
      </Card>
    )
  }

  return (
    <>
      <WeatherCard place={place} ctx={ctx} fetchedAt={state.forecast.fetchedAt} offline={state.offline} onRefresh={refresh} />
      {children?.(ctx)}
    </>
  )
}
