import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Lang, When } from '@/engine/types'
import { addHours, ammanNow, atHour, dateOf, hourOf } from '@/engine/time'
import { FORECAST_DAYS, RELIABLE_DAYS } from '@/features/weather/api'
import { formatHour, formatWeekday, relativeDay } from '@/lib/format'
import { Button, Chip, Sheet, cx } from '@/ui'

interface WhenSheetProps {
  open: boolean
  value: When
  onClose: () => void
  onChange: (when: When) => void
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6 AM – 11 PM

export function WhenSheet({ open, value, onClose, onChange }: WhenSheetProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const now = ammanNow()
  const today = dateOf(now)
  const days = Array.from({ length: FORECAST_DAYS }, (_, i) => dateOf(addHours(`${today}T12:00`, i * 24)))

  const initialDay = value.kind === 'at' ? dateOf(value.time) : today
  const [day, setDay] = useState(initialDay)
  const [hour, setHour] = useState<number | null>(value.kind === 'at' ? hourOf(value.time) : null)

  const hoursForDay = day === today ? HOURS.filter((h) => h > hourOf(now)) : HOURS
  const dayLabel = (d: string) => {
    const rel = relativeDay(`${d}T12:00`)
    return rel ? t(`time.${rel}`) : formatWeekday(`${d}T12:00`, lang)
  }

  const confirm = () => {
    onChange(hour === null ? { kind: 'now' } : { kind: 'at', time: atHour(day, hour) })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('plan.whenTitle')} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-5 pb-3">
        <Chip
          selected={hour === null}
          onClick={() => {
            setDay(today)
            setHour(null)
          }}
          className="self-start"
        >
          {t('plan.now')}
        </Chip>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">{t('plan.day')}</h3>
          <div className="snap-row -mx-5 flex gap-2 overflow-x-auto px-5">
            {days.map((d, i) => (
              <Chip
                key={d}
                selected={hour !== null && d === day}
                onClick={() => {
                  setDay(d)
                  if (hour === null || (d === today && hour <= hourOf(now))) setHour(d === today ? Math.min(23, hourOf(now) + 1) : 9)
                }}
                className={cx('shrink-0', i >= RELIABLE_DAYS && 'border-dashed')}
              >
                {dayLabel(d)}
              </Chip>
            ))}
          </div>
          {hour !== null && days.indexOf(day) >= RELIABLE_DAYS && <p className="text-sm text-muted">{t('plan.farAhead')}</p>}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">{t('plan.hour')}</h3>
          <div className="grid grid-cols-4 gap-2">
            {hoursForDay.map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={hour === h}
                onClick={() => setHour(h)}
                className={cx(
                  'h-11 rounded-control border text-sm font-medium transition-colors',
                  hour === h ? 'border-primary bg-primary-soft text-primary-strong' : 'border-border hover:bg-surface-2',
                )}
              >
                {formatHour(atHour(day, h), lang)}
              </button>
            ))}
          </div>
        </section>

        <Button block onClick={confirm}>
          {t('common.done')}
        </Button>
      </div>
    </Sheet>
  )
}
