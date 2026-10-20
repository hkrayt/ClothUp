import { useTranslation } from 'react-i18next'
import type { Gender, Style } from '@/engine/types'
import { Segmented, Sheet } from '@/ui'
import { useSettings, type Language, type ThemePref } from '@/app/settings'
import { useApp } from '@/app/store'
import { STYLES } from '@/features/onboarding/Onboarding'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      {children}
    </section>
  )
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { language, theme, setLanguage, setTheme } = useSettings()
  const { profile, updateProfile } = useApp()

  return (
    <Sheet open={open} onClose={onClose} title={t('settings.title')} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-6 py-3">
        {profile && (
          <>
            <Section title={t('settings.gender')}>
              <Segmented<Gender>
                label={t('settings.gender')}
                value={profile.gender}
                onChange={(gender) => updateProfile({ gender, style: 'standard' })}
                options={(['male', 'female'] as Gender[]).map((g) => ({ value: g, label: t(`profile.gender.${g}`) }))}
              />
            </Section>
            <Section title={t('settings.style')}>
              <Segmented<Style>
                label={t('settings.style')}
                value={profile.style}
                onChange={(style) => updateProfile({ style })}
                options={STYLES[profile.gender].map((s) => ({ value: s, label: t(`profile.style.${profile.gender}.${s}`) }))}
              />
            </Section>
          </>
        )}
        <Section title={t('settings.language')}>
          <Segmented<Language>
            label={t('settings.language')}
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'العربية' },
            ]}
          />
        </Section>
        <Section title={t('settings.theme')}>
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
        </Section>
      </div>
    </Sheet>
  )
}
