import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, ChevronDown, Hourglass, MapPin, Sparkles } from 'lucide-react'
import type { Duration, Lang, Place, When } from '@/engine/types'
import { useApp, frequentPlaces } from '@/app/store'
import { useNav } from '@/app/nav'
import { Button, Card, Chip } from '@/ui'
import { PlacePicker } from '@/features/places/PlacePicker'
import { formatHour, formatWeekday, relativeDay } from '@/lib/format'
import { getPlace } from '@/features/places/places'
import { OCCASIONS, OccasionIcon } from './occasions'
import { WhenSheet } from './WhenSheet'

const DURATIONS: Duration[] = [2, 3, 6, 10, 'night']

export function resolvePlace(p: string | Place): Place {
  return typeof p === 'string' ? (getPlace(p) ?? getPlace('amman')!) : p
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
        {icon}
        {label}
      </h2>
      {children}
    </section>
  )
}

export function useWhenLabel() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  return (when: When) => {
    if (when.kind === 'now') return t('plan.now')
    const rel = relativeDay(when.time)
    const day = rel ? t(`time.${rel}`) : formatWeekday(when.time, lang)
    return `${day} · ${formatHour(when.time, lang)}`
  }
}

/** The single-card question form. With remembered answers, one tap on the button gets a suggestion. */
export function HomeScreen() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const { plan, setPlan, placeUsage, recordUse } = useApp()
  const go = useNav((s) => s.go)
  const [placeOpen, setPlaceOpen] = useState(false)
  const [whenOpen, setWhenOpen] = useState(false)
  const whenLabel = useWhenLabel()

  const place = resolvePlace(plan.place)
  const frequent = frequentPlaces(placeUsage).filter((id) => id !== place.id)

  const suggest = () => {
    recordUse()
    go('result')
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-10 pt-2">
      <h1 className="px-1 text-2xl font-bold tracking-tight">{t('plan.title')}</h1>

      <Card className="flex flex-col gap-6">
        <Field icon={<MapPin size={16} aria-hidden />} label={t('plan.where')}>
          <button
            type="button"
            onClick={() => setPlaceOpen(true)}
            className="flex min-h-14 items-center gap-3 rounded-control border border-border bg-surface-2 px-4 text-start font-semibold hover:border-primary"
          >
            <span className="flex-1 truncate">{place.name[lang]}</span>
            <ChevronDown size={20} className="text-muted" aria-hidden />
          </button>
          {frequent.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {frequent.map((id) => (
                <Chip key={id} onClick={() => setPlan({ place: id })} className="min-h-10 text-sm">
                  {getPlace(id)?.name[lang]}
                </Chip>
              ))}
            </div>
          )}
        </Field>

        <Field icon={<CalendarClock size={16} aria-hidden />} label={t('plan.when')}>
          <button
            type="button"
            onClick={() => setWhenOpen(true)}
            className="flex min-h-14 items-center gap-3 rounded-control border border-border bg-surface-2 px-4 text-start font-semibold hover:border-primary"
          >
            <span className="flex-1 truncate">{whenLabel(plan.when)}</span>
            <ChevronDown size={20} className="text-muted" aria-hidden />
          </button>
        </Field>

        <Field icon={<Hourglass size={16} aria-hidden />} label={t('plan.duration')}>
          <div role="radiogroup" aria-label={t('plan.duration')} className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <Chip key={d} role="radio" aria-checked={plan.duration === d} selected={plan.duration === d} onClick={() => setPlan({ duration: d })} className="min-h-10 text-sm">
                {t(`plan.durations.${d}`)}
              </Chip>
            ))}
          </div>
        </Field>

        <Field icon={<Sparkles size={16} aria-hidden />} label={t('plan.occasion')}>
          <div role="radiogroup" aria-label={t('plan.occasion')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {OCCASIONS.map((o) => (
              <Chip
                key={o.id}
                role="radio"
                aria-checked={plan.occasion === o.id}
                selected={plan.occasion === o.id}
                onClick={() => setPlan({ occasion: o.id })}
                icon={<OccasionIcon id={o.id} size={18} />}
                className="justify-start rounded-control text-sm"
              >
                {t(`occasion.${o.id}`)}
              </Chip>
            ))}
          </div>
        </Field>
      </Card>

      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-4 pt-6 safe-bottom">
        <Button size="lg" block icon={<Sparkles size={20} />} onClick={suggest}>
          {t('plan.suggest')}
        </Button>
      </div>

      <PlacePicker
        open={placeOpen}
        onClose={() => setPlaceOpen(false)}
        onPick={(p) => setPlan({ place: p.id === 'current' ? p : p.id })}
        selectedId={place.id}
        frequent={frequentPlaces(placeUsage, 5)}
      />
      {whenOpen && <WhenSheet open value={plan.when} onClose={() => setWhenOpen(false)} onChange={(when) => setPlan({ when })} />}
    </main>
  )
}
