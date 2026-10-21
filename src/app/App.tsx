import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { IconButton } from '@/ui'
import { SettingsSheet } from '@/features/settings/SettingsSheet'
import { Onboarding } from '@/features/onboarding/Onboarding'
import { HomeScreen } from '@/features/questions/HomeScreen'
import { ResultScreen } from '@/features/outfit/ResultScreen'
import { TripScreen } from '@/features/trip/TripScreen'
import { useReminderSync } from '@/features/reminder/useReminderSync'
import { AppHeader } from './AppHeader'
import { useApplyAppearance } from './theme'
import { useApp } from './store'
import { useHistorySync, useHydrated, useNav } from './nav'

export function App() {
  useApplyAppearance()
  useHistorySync()
  useReminderSync()
  const hydrated = useHydrated()
  const { t, i18n } = useTranslation()
  const profile = useApp((s) => s.profile)
  const { screen, back } = useNav()
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (!hydrated) return null
  if (!profile) return <Onboarding />

  const BackIcon = i18n.language === 'ar' ? ArrowRight : ArrowLeft

  return (
    <div className="min-h-dvh">
      <AppHeader
        onOpenSettings={() => setSettingsOpen(true)}
        start={
          screen !== 'home' ? (
            <IconButton label={t('common.back')} onClick={back} className="-ms-2">
              <BackIcon size={22} />
            </IconButton>
          ) : undefined
        }
      />
      {screen === 'home' ? <HomeScreen /> : screen === 'trip' ? <TripScreen /> : <ResultScreen />}
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
