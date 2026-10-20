import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, GraduationCap, Landmark, LocateFixed, MapPin, Plane, Search, Loader2, type LucideIcon } from 'lucide-react'
import type { PlaceType } from '@/engine/types'
import type { Lang, Place } from '@/engine/types'
import { Sheet, cx } from '@/ui'
import { getCurrentCoords, type GeoError } from '@/lib/geo'
import { PLACES, currentLocationPlace, getPlace, groupByGovernorate, searchPlaces } from './places'

const TYPE_ICON: Record<PlaceType, LucideIcon> = {
  city: MapPin,
  town: MapPin,
  neighbourhood: Building2,
  tourist: Landmark,
  campus: GraduationCap,
  transport: Plane,
}

function PlaceList({ places, selectedId, onPick, label }: { places: Place[]; selectedId?: string; onPick: (p: Place) => void; label: string }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  return (
    <ul className="flex flex-col" role="listbox" aria-label={label}>
      {places.map((p) => {
        const Icon = TYPE_ICON[p.type ?? 'town']
        const details = [p.governorate && t(`governorate.${p.governorate}`), t(`zone.${p.zone}`), p.elevation !== undefined && t('place.elevation', { m: p.elevation })]
        return (
          <li key={p.id}>
            <button
              type="button"
              role="option"
              aria-selected={p.id === selectedId}
              onClick={() => onPick(p)}
              className={cx('flex min-h-14 w-full items-center gap-3 rounded-control px-3 text-start hover:bg-surface-2', p.id === selectedId && 'bg-primary-soft')}
            >
              <Icon size={20} className="shrink-0 text-muted" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{p.name[lang]}</span>
                <span className="truncate text-sm text-muted">{details.filter(Boolean).join(' · ')}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

interface PlacePickerProps {
  open: boolean
  onClose: () => void
  onPick: (place: Place) => void
  selectedId?: string
  /** Frequently used place ids, shown first when the search is empty. */
  frequent?: string[]
}

export function PlacePicker({ open, onClose, onPick, selectedId, frequent = [] }: PlacePickerProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const [query, setQuery] = useState('')
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<GeoError | null>(null)

  const results = useMemo(() => searchPlaces(query, lang), [query, lang])
  const sections = useMemo(() => {
    const recent = frequent.map((id) => getPlace(id)).filter((p): p is Place => !!p)
    return [
      ...(recent.length ? [{ key: 'recent', title: t('place.recent'), places: recent }] : []),
      ...groupByGovernorate(PLACES, lang).map((g) => ({ key: g.governorate, title: t(`governorate.${g.governorate}`), places: g.places })),
    ]
  }, [frequent, lang, t])

  const pick = (p: Place) => {
    onPick(p)
    setQuery('')
    onClose()
  }

  const useLocation = async () => {
    setLocating(true)
    setGeoError(null)
    try {
      const { lat, lon } = await getCurrentCoords()
      pick(currentLocationPlace(lat, lon))
    } catch (e) {
      setGeoError(e === 'denied' ? 'denied' : 'unavailable')
    } finally {
      setLocating(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('place.title')} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-3 pb-3">
        <label className="flex h-12 items-center gap-2 rounded-control border border-border bg-surface-2 px-3 focus-within:border-primary">
          <Search size={20} className="text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('place.search')}
            aria-label={t('place.search')}
            className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            autoComplete="off"
          />
        </label>

        <button
          type="button"
          onClick={useLocation}
          disabled={locating}
          className="flex min-h-12 items-center gap-3 rounded-control px-3 text-start font-semibold text-primary hover:bg-primary-soft"
        >
          {locating ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <LocateFixed size={20} aria-hidden />}
          {locating ? t('place.locating') : t('place.current')}
        </button>
        {geoError && <p className="px-3 text-sm text-danger">{t(`place.geoError.${geoError}`)}</p>}

        {query.trim() ? (
          <PlaceList places={results} selectedId={selectedId} onPick={pick} label={t('place.title')} />
        ) : (
          sections.map((s) => (
            <section key={s.key} className="flex flex-col gap-1">
              <h3 className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{s.title}</h3>
              <PlaceList places={s.places} selectedId={selectedId} onPick={pick} label={s.title} />
            </section>
          ))
        )}
        {query.trim() && results.length === 0 && <p className="px-3 py-6 text-center text-muted">{t('place.noResults')}</p>}
      </div>
    </Sheet>
  )
}
