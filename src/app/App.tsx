import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Briefcase, Coffee, Dumbbell, GraduationCap, Sparkles } from 'lucide-react'
import { Button, Card, Chip, Swatch } from '@/ui'
import { SettingsSheet } from '@/features/settings/SettingsSheet'
import { AppHeader } from './AppHeader'
import { useApplyAppearance } from './theme'

/** Milestone 1 preview: shows the design system in place of the real flow. */
export function App() {
  useApplyAppearance()
  const { t } = useTranslation()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [occasion, setOccasion] = useState('work')

  const occasions = [
    { id: 'work', icon: <Briefcase size={18} />, label: 'Work' },
    { id: 'casual', icon: <Coffee size={18} />, label: 'Casual' },
    { id: 'university', icon: <GraduationCap size={18} />, label: 'University' },
    { id: 'gym', icon: <Dumbbell size={18} />, label: 'Gym' },
  ]

  return (
    <div className="min-h-dvh">
      <AppHeader onOpenSettings={() => setSettingsOpen(true)} />
      <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 pb-10 pt-2">
        <Card className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{t('preview.welcome')}</h1>
          <p className="text-muted">{t('preview.body')}</p>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted">{t('preview.occasions')}</h2>
          <div className="flex flex-wrap gap-2">
            {occasions.map((o) => (
              <Chip key={o.id} icon={o.icon} selected={occasion === o.id} onClick={() => setOccasion(o.id)}>
                {o.label}
              </Chip>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted">{t('preview.palette')}</h2>
          <div className="flex justify-around">
            <Swatch hex="#1F2A44" name="Navy" />
            <Swatch hex="#F7F5F0" name="Off-white" />
            <Swatch hex="#C19A6B" name="Camel" />
            <Swatch hex="#5A3E2B" name="Brown" />
          </div>
        </Card>

        <Button size="lg" block icon={<Sparkles size={20} />} disabled>
          {t('preview.start')}
        </Button>
        <p className="text-center text-sm text-muted">{t('preview.comingSoon')}</p>
      </main>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
