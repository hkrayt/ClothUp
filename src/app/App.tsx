import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, MapPin, Sparkles } from 'lucide-react'
import type { Lang, Place } from '@/engine/types'
import { ammanNow } from '@/engine/time'
import { Button, Card } from '@/ui'
import { SettingsSheet } from '@/features/settings/SettingsSheet'
import { PlacePicker } from '@/features/places/PlacePicker'
import { getPlace } from '@/features/places/places'
import { WeatherPanel } from '@/features/weather/WeatherPanel'
import { AppHeader } from './AppHeader'
import { useApplyAppearance } from './theme'

/** Milestone 2 preview: pick a place and see its weather for the next 3 hours. */
export function App() {
  useApplyAppearance()
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [place, setPlace] = useState<Place>(getPlace('amman')!)
  const [start] = useState(ammanNow)

  return (
    <div className="min-h-dvh">
      <AppHeader onOpenSettings={() => setSettingsOpen(true)} />
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-10 pt-2">
        <Card className="flex flex-col gap-3">
          <h1 className="text-xl font-bold tracking-tight">{t('preview.where')}</h1>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex min-h-14 items-center gap-3 rounded-control border border-border bg-surface-2 px-4 text-start font-semibold hover:border-primary"
          >
            <MapPin size={20} className="text-primary" aria-hidden />
            <span className="flex-1 truncate">{place.name[lang]}</span>
            <ChevronDown size={20} className="text-muted" aria-hidden />
          </button>
        </Card>

        <WeatherPanel place={place} start={start} hours={3} />

        <Button size="lg" block icon={<Sparkles size={20} />} disabled>
          {t('preview.start')}
        </Button>
        <p className="text-center text-sm text-muted">{t('preview.comingSoon')}</p>
      </main>
      <PlacePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={setPlace} selectedId={place.id} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
