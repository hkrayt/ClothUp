import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings } from 'lucide-react'
import { IconButton } from '@/ui'
import { Logo } from '@/ui/Logo'

interface AppHeaderProps {
  onOpenSettings: () => void
  start?: ReactNode
}

export function AppHeader({ onOpenSettings, start }: AppHeaderProps) {
  const { t } = useTranslation()
  return (
    <header className="safe-top sticky top-0 z-10 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        {start ?? <Logo size={34} />}
        <span className="text-lg font-bold tracking-tight">{t('app.name')}</span>
        <div className="ms-auto">
          <IconButton label={t('common.settings')} onClick={onOpenSettings}>
            <Settings size={22} />
          </IconButton>
        </div>
      </div>
    </header>
  )
}
