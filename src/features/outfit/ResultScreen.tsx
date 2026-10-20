import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shirt } from 'lucide-react'
import type { Lang } from '@/engine/types'
import { useApp } from '@/app/store'
import { durationHours, resolveStart } from '@/engine/stay'
import { Card } from '@/ui'
import { WeatherPanel } from '@/features/weather/WeatherPanel'
import { OccasionIcon } from '@/features/questions/occasions'
import { resolvePlace, useWhenLabel } from '@/features/questions/HomeScreen'

export function ResultScreen() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const plan = useApp((s) => s.plan)
  const place = resolvePlace(plan.place)
  const whenLabel = useWhenLabel()
  // Fix the start once per visit so the card doesn't jump if the hour rolls over.
  const [start] = useState(() => resolveStart(plan.when))
  const hours = durationHours(plan.duration, start)

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-10 pt-2">
      <div className="flex flex-wrap items-center gap-2 px-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 font-medium text-text">
          <OccasionIcon id={plan.occasion} size={16} />
          {t(`occasion.${plan.occasion}`)}
        </span>
        <span>
          {place.name[lang]} · {whenLabel(plan.when)} · {t(`plan.durations.${plan.duration}`)}
        </span>
      </div>

      <WeatherPanel place={place} start={start} hours={hours}>
        {() => (
          <Card className="flex flex-col items-center gap-3 py-10 text-center">
            <Shirt size={40} className="text-primary" aria-hidden />
            <p className="text-muted">{t('result.outfitSoon')}</p>
          </Card>
        )}
      </WeatherPanel>
    </main>
  )
}
