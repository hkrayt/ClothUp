import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Droplets, Info, Umbrella, Wind, SunMedium, WifiOff, RefreshCw } from 'lucide-react'
import type { Lang, Place, WeatherContext } from '@/engine/types'
import { uvLevel, weatherNotes } from '@/engine/notes'
import { Card, IconButton, cx } from '@/ui'
import { formatHour, formatTemp, formatWeekday, minutesAgo, relativeDay } from '@/lib/format'
import { WeatherIcon } from './WeatherIcon'

interface WeatherCardProps {
  place: Place
  ctx: WeatherContext
  fetchedAt: number
  offline: boolean
  onRefresh?: () => void
}

function Stat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-control bg-surface-2 px-2 py-2.5 text-center">
      {icon}
      <span className="text-base font-semibold leading-tight">{value}</span>
      <span className="truncate text-xs text-muted">{sub ?? label}</span>
    </div>
  )
}

export function WeatherCard({ place, ctx, fetchedAt, offline, onRefresh }: WeatherCardProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const day = relativeDay(ctx.start)
  const dayLabel = day ? t(`time.${day}`) : formatWeekday(ctx.start, lang)
  const range = `${formatHour(ctx.start, lang)} – ${formatHour(ctx.end, lang)}`
  const notes = weatherNotes(ctx)
  const ago = minutesAgo(fetchedAt)

  return (
    <Card className="flex flex-col gap-4" aria-live="polite">
      <div className="flex items-center gap-4">
        <WeatherIcon condition={ctx.condition} night={ctx.isNight} size={56} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{formatTemp(ctx.tempNow)}</span>
            <span className="text-sm text-muted">{t('weather.feelsLike', { t: formatTemp(ctx.feelsNow) })}</span>
          </div>
          <span className="truncate font-semibold">{place.name[lang]}</span>
          <span className="text-sm text-muted">
            {dayLabel} · {range}
          </span>
        </div>
      </div>

      <p className="text-sm text-muted">
        {t(`weather.condition.${ctx.condition}`)} ·{' '}
        {t('weather.range', { min: formatTemp(ctx.feelsMin), max: formatTemp(ctx.feelsMax) })}
      </p>

      <div className="grid grid-cols-4 gap-2">
        <Stat icon={<Umbrella size={18} color="var(--rain)" aria-hidden />} label={t('weather.rain')} value={`${ctx.rainProb}%`} />
        <Stat
          icon={<Wind size={18} color="var(--wind)" aria-hidden />}
          label={t('weather.wind')}
          value={`${ctx.wind}`}
          sub={t('weather.kmh')}
        />
        <Stat
          icon={<SunMedium size={18} color="var(--sun)" aria-hidden />}
          label={t('weather.uv')}
          value={`${Math.round(ctx.uvMax)}`}
          sub={t(`weather.uvLevel.${uvLevel(ctx.uvMax)}`)}
        />
        <Stat icon={<Droplets size={18} color="var(--rain)" aria-hidden />} label={t('weather.humidity')} value={`${ctx.humidity}%`} />
      </div>

      {notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((n) => (
            <li
              key={n.key}
              className={cx(
                'flex items-start gap-2 rounded-control px-3 py-2 text-sm',
                n.tone === 'warn' ? 'bg-accent-soft' : 'bg-primary-soft',
              )}
            >
              {n.tone === 'warn' ? (
                <AlertTriangle size={18} className="mt-0.5 shrink-0" color="var(--sun)" aria-hidden />
              ) : (
                <Info size={18} className="mt-0.5 shrink-0" color="var(--primary)" aria-hidden />
              )}
              <span>{t(`weather.notes.${n.key}`, n.params)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 text-xs text-muted">
        {offline && (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 font-medium">
            <WifiOff size={14} aria-hidden />
            {t('weather.offline')}
          </span>
        )}
        <span>{ago < 1 ? t('weather.updatedNow') : t('weather.updatedAgo', { count: ago })}</span>
        {onRefresh && (
          <IconButton label={t('weather.refresh')} onClick={onRefresh} className="ms-auto h-9 w-9">
            <RefreshCw size={16} />
          </IconButton>
        )}
      </div>
    </Card>
  )
}

export function WeatherCardSkeleton() {
  return (
    <Card className="flex animate-pulse flex-col gap-4" aria-busy>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-surface-2" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-7 w-24 rounded bg-surface-2" />
          <div className="h-4 w-40 rounded bg-surface-2" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-control bg-surface-2" />
        ))}
      </div>
    </Card>
  )
}
