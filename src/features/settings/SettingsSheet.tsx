import { useTranslation } from 'react-i18next'
import { Segmented, Sheet } from '@/ui'
import { useSettings, type Language, type ThemePref } from '@/app/settings'

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { language, theme, setLanguage, setTheme } = useSettings()

  return (
    <Sheet open={open} onClose={onClose} title={t('settings.title')} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-6 py-3">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">{t('settings.language')}</h3>
          <Segmented<Language>
            label={t('settings.language')}
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'العربية' },
            ]}
          />
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">{t('settings.theme')}</h3>
          <Segmented<ThemePref>
            label={t('settings.theme')}
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: t('settings.themeSystem') },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
            ]}
          />
        </section>
      </div>
    </Sheet>
  )
}
