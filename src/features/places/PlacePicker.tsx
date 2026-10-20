import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LocateFixed, MapPin, Search, Loader2 } from 'lucide-react'
import type { Lang, Place } from '@/engine/types'
import { Sheet, cx } from '@/ui'
import { getCurrentCoords, type GeoError } from '@/lib/geo'
import { currentLocationPlace, searchPlaces } from './places'

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

  const results = useMemo(() => {
    const list = searchPlaces(query, lang)
    if (query.trim() || frequent.length === 0) return list
    const top = frequent.map((id) => list.find((p) => p.id === id)).filter((p): p is Place => !!p)
    return [...top, ...list.filter((p) => !frequent.includes(p.id))]
  }, [query, lang, frequent])

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

        <ul className="flex flex-col" role="listbox" aria-label={t('place.title')}>
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={p.id === selectedId}
                onClick={() => pick(p)}
                className={cx(
                  'flex min-h-14 w-full items-center gap-3 rounded-control px-3 text-start hover:bg-surface-2',
                  p.id === selectedId && 'bg-primary-soft',
                )}
              >
                <MapPin size={20} className="shrink-0 text-muted" aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{p.name[lang]}</span>
                  <span className="truncate text-sm text-muted">{t(`zone.${p.zone}`)}</span>
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-6 text-center text-muted">{t('place.noResults')}</li>}
        </ul>
      </div>
    </Sheet>
  )
}
