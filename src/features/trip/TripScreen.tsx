import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Check, ChevronDown, CloudOff, Luggage, MapPin, Sparkles } from 'lucide-react'
import type { Lang, OccasionId, Place } from '@/engine/types'
import { COLORS, DATA } from '@/engine/catalog'
import { figureScale } from '@/engine/personal'
import { addHours, ammanNow, atHour, dateOf } from '@/engine/time'
import { TRIP_DAYS, dayOccasions, dayWindow, packingList, planTrip, tripDates, type TripDay } from '@/engine/trip'
import { frequentPlaces, newTrip, useApp, type Trip } from '@/app/store'
import { useNav } from '@/app/nav'
import { Character } from '@/features/character/Character'
import { colorName } from '@/features/outfit/PaletteCard'
import { SLOT_ORDER, sortPieces } from '@/features/outfit/OutfitList'
import { PlacePicker } from '@/features/places/PlacePicker'
import { OCCASIONS, OccasionIcon, getOccasion } from '@/features/questions/occasions'
import { resolvePlace } from '@/features/questions/HomeScreen'
import { useForecast } from '@/features/weather/useForecast'
import { stayContext } from '@/features/weather/stay'
import { WeatherIcon } from '@/features/weather/WeatherIcon'
import { formatWeekday } from '@/lib/format'
import { Button, Card, Chip, Switch, cx } from '@/ui'

/** Trips can start up to two months ahead (typical weather is used beyond the 16-day forecast). */
const MAX_START_DAYS = 60

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

function TripForm({ trip, setTrip, place }: { trip: Trip; setTrip: (p: Partial<Trip>) => void; place: Place }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const placeUsage = useApp((s) => s.placeUsage)
  const [placeOpen, setPlaceOpen] = useState(false)
  const today = dateOf(ammanNow())
  const tomorrow = dateOf(addHours(atHour(today, 12), 24))
  const maxStart = dateOf(addHours(atHour(today, 12), 24 * MAX_START_DAYS))

  return (
    <Card className="flex flex-col gap-6">
      <Field icon={<MapPin size={16} aria-hidden />} label={t('trip.where')}>
        <button
          type="button"
          onClick={() => setPlaceOpen(true)}
          className="flex min-h-14 items-center gap-3 rounded-control border border-border bg-surface-2 px-4 text-start font-semibold hover:border-primary"
        >
          <span className="flex-1 truncate">{place.name[lang]}</span>
          <ChevronDown size={20} className="text-muted" aria-hidden />
        </button>
      </Field>

      <Field icon={<CalendarDays size={16} aria-hidden />} label={t('trip.from')}>
        <div className="flex flex-wrap items-center gap-2">
          {[today, tomorrow].map((d) => (
            <Chip key={d} selected={trip.startDate === d} onClick={() => setTrip({ startDate: d })} className="min-h-10 text-sm">
              {t(`time.${d === today ? 'today' : 'tomorrow'}`)}
            </Chip>
          ))}
          <label className="flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm">
            <span className="sr-only">{t('trip.pickDate')}</span>
            <input
              type="date"
              min={today}
              max={maxStart}
              value={trip.startDate}
              onChange={(e) => e.target.value && setTrip({ startDate: e.target.value })}
              className="bg-transparent font-medium outline-none"
            />
          </label>
        </div>
      </Field>

      <Field icon={<Luggage size={16} aria-hidden />} label={t('trip.days')}>
        <div role="radiogroup" aria-label={t('trip.days')} className="flex flex-wrap gap-2">
          {TRIP_DAYS.map((n) => (
            <Chip key={n} role="radio" aria-checked={trip.days === n} selected={trip.days === n} onClick={() => setTrip({ days: n })} className="min-h-10 text-sm">
              {t('trip.nDays', { count: n })}
            </Chip>
          ))}
        </div>
      </Field>

      <Field icon={<Sparkles size={16} aria-hidden />} label={t('trip.occasion')}>
        <div role="radiogroup" aria-label={t('trip.occasion')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {OCCASIONS.map((o) => (
            <Chip
              key={o.id}
              role="radio"
              aria-checked={trip.occasion === o.id}
              selected={trip.occasion === o.id}
              onClick={() => setTrip({ occasion: o.id })}
              icon={<OccasionIcon id={o.id} size={18} />}
              className="justify-start rounded-control text-sm"
            >
              {t(`occasion.${o.id}`)}
            </Chip>
          ))}
        </div>
        <Switch checked={trip.travelDays} onChange={(travelDays) => setTrip({ travelDays })} label={t('trip.travelDays')} hint={t('trip.travelDaysHint')} />
      </Field>

      <PlacePicker
        open={placeOpen}
        onClose={() => setPlaceOpen(false)}
        onPick={(p) => setTrip({ place: p.id === 'current' ? p : p.id })}
        selectedId={place.id}
        frequent={frequentPlaces(placeUsage, 5)}
      />
    </Card>
  )
}

function DayCard({ day, index, onOpen }: { day: TripDay; index: number; onOpen: () => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const profile = useApp((s) => s.profile)!
  const { ctx, outfit } = day
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {ctx && <WeatherIcon condition={ctx.condition} size={32} />}
        <div className="flex flex-1 flex-col">
          <span className="font-semibold">
            {t('trip.dayN', { n: index + 1 })} · {formatWeekday(atHour(day.date, 12), lang)}
          </span>
          <span className="text-sm text-muted">
            {ctx ? t('trip.feels', { min: Math.round(ctx.feelsMin), max: Math.round(ctx.feelsMax) }) : t('trip.noWeather')}
            {ctx && ctx.rainProb >= 40 && ` · ${t('trip.rain', { p: ctx.rainProb })}`}
            {' · '}
            {t(`occasion.${day.occasion}`)}
          </span>
        </div>
        {ctx?.source === 'climate' && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">{t('trip.typical')}</span>}
      </div>
      {outfit && (
        <button type="button" onClick={onOpen} className="flex items-center gap-3 rounded-control text-start hover:bg-surface-2" aria-label={t('trip.openDay', { n: index + 1 })}>
          <span className="flex h-36 w-24 shrink-0 items-center justify-center rounded-control bg-stage" aria-hidden>
            <Character pieces={outfit.pieces} gender={profile.gender} skinTone={profile.skinTone} figure={figureScale(profile)} lang={lang} label="" className="h-32 w-auto text-text" />
          </span>
          <ul className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            {sortPieces(outfit.pieces)
              .filter((p) => p.slot !== 'accessory')
              .map((p) => (
                <li key={`${p.slot}-${p.item.id}`} className="flex items-center gap-2">
                  {p.color && <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ background: COLORS.hex(p.color) }} aria-hidden />}
                  <span className="truncate">{p.item.name[lang]}</span>
                </li>
              ))}
          </ul>
        </button>
      )}
    </Card>
  )
}

function PackingList({ days, packed, onToggle }: { days: TripDay[]; packed: string[]; onToggle: (key: string) => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const list = packingList(days, SLOT_ORDER)
  const done = list.filter((l) => packed.includes(l.key)).length
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('trip.packing')}</h2>
        <span className="text-sm text-muted" aria-live="polite">
          {t('trip.packedCount', { done, total: list.length })}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {list.map((l) => {
          const on = packed.includes(l.key)
          const { piece } = l
          return (
            <li key={l.key}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => onToggle(l.key)} className="flex min-h-12 w-full items-center gap-3 py-2 text-start">
                <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2', on ? 'border-primary bg-primary text-on-primary' : 'border-border')} aria-hidden>
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
                {piece.color && <span className="h-4 w-4 shrink-0 rounded-full border border-black/10" style={{ background: COLORS.hex(piece.color) }} aria-hidden />}
                <span className={cx('flex min-w-0 flex-1 flex-col', on && 'text-muted line-through')}>
                  <span className="font-medium">
                    {piece.item.name[lang]}
                    {l.count > 1 && <span className="text-muted"> × {l.count}</span>}
                  </span>
                  {piece.color && <span className="text-xs text-muted">{colorName(piece.color, lang)}</span>}
                </span>
                {piece.missing && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">{t('closet.notOwned')}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function TripPlan({ trip, place, onToggle }: { trip: Trip; place: Place; onToggle: (key: string) => void }) {
  const { t } = useTranslation()
  const profile = useApp((s) => s.profile)!
  const setPlan = useApp((s) => s.setPlan)
  const go = useNav((s) => s.go)
  // Learned preferences and the closet are read once per visit, like on the result screen.
  const [prefs] = useState(() => useApp.getState().itemPrefs)
  const [owned] = useState(() => {
    const { closet } = useApp.getState()
    return closet.enabled && closet.owned.length > 0 ? closet.owned : undefined
  })
  const { state, refresh } = useForecast(place)
  const forecast = state.status === 'ready' ? state.forecast : null

  const days = useMemo(() => {
    if (state.status !== 'ready' && state.status !== 'error') return null
    const dates = tripDates(trip.startDate, trip.days)
    const occasions = dayOccasions(trip.days, trip.occasion, trip.travelDays)
    const plans = dates.map((date, i) => {
      const { start, hours } = dayWindow(date)
      return { date, occasion: occasions[i] as OccasionId, ctx: stayContext(forecast, place, start, hours) }
    })
    return planTrip(plans, profile, getOccasion, DATA, { prefs, owned })
  }, [state.status, forecast, place, trip.startDate, trip.days, trip.occasion, trip.travelDays, profile, prefs, owned])

  if (!days) return <Card className="h-40 animate-pulse bg-surface-2" aria-busy="true" />

  const openDay = (day: TripDay) => {
    setPlan({ place: trip.place, when: { kind: 'at', time: dayWindow(day.date).start }, duration: 10, occasion: day.occasion })
    go('result')
  }

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <div className="flex flex-col gap-3">
        {state.status === 'error' && (
          <Card className="flex items-center gap-3">
            <CloudOff size={24} className="shrink-0 text-muted" aria-hidden />
            <p className="flex-1 text-sm">{t('trip.offline')}</p>
            <Button variant="secondary" className="h-10 px-4 text-sm" onClick={refresh}>
              {t('common.retry')}
            </Button>
          </Card>
        )}
        {days.map((d, i) => (
          <DayCard key={d.date} day={d} index={i} onOpen={() => openDay(d)} />
        ))}
      </div>
      <div className="lg:sticky lg:top-20">
        <PackingList days={days} packed={trip.packed} onToggle={onToggle} />
      </div>
    </div>
  )
}

/** Trip planner: an outfit for each day of a multi-day trip and one packing list. */
export function TripScreen() {
  const { t } = useTranslation()
  const stored = useApp((s) => s.trip)
  const plan = useApp((s) => s.plan)
  const setTrip = useApp((s) => s.setTrip)
  const today = dateOf(ammanNow())
  // A trip that has already ended starts over from tomorrow.
  const ended = stored && dateOf(addHours(atHour(stored.startDate, 12), 24 * (stored.days - 1))) < today
  const trip = stored && !ended ? (stored.startDate < today ? { ...stored, startDate: today } : stored) : newTrip(plan, today)
  const place = resolvePlace(trip.place)
  const update = (patch: Partial<Trip>) => setTrip({ ...trip, ...patch })
  const togglePacked = (key: string) => update({ packed: trip.packed.includes(key) ? trip.packed.filter((k) => k !== key) : [...trip.packed, key] })

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-10 pt-2 lg:max-w-5xl">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Luggage size={24} className="text-primary" aria-hidden />
          {t('trip.title')}
        </h1>
        <p className="text-sm text-muted">{t('trip.hint')}</p>
      </div>
      <div className="flex flex-col gap-4 lg:max-w-xl">
        <TripForm trip={trip} setTrip={update} place={place} />
      </div>
      <TripPlan trip={trip} place={place} onToggle={togglePacked} />
    </main>
  )
}
