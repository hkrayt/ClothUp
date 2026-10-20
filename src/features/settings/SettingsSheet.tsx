import { useTranslation } from 'react-i18next'
import type { Gender, Style } from '@/engine/types'
import { Button, Segmented, Sheet, cx } from '@/ui'
import { SKIN_TONES } from '@/features/character/body'
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
  const { profile, updateProfile, itemPrefs, resetPrefs } = useApp()
  const learned = Object.keys(itemPrefs).length

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
            <Section title={t('settings.skinTone')}>
              <div role="radiogroup" aria-label={t('settings.skinTone')} className="flex gap-3">
                {SKIN_TONES.map((hex, i) => (
                  <button
                    key={hex}
                    type="button"
                    role="radio"
                    aria-checked={profile.skinTone === i}
                    aria-label={t('settings.skinToneN', { n: i + 1 })}
                    onClick={() => updateProfile({ skinTone: i })}
                    className={cx(
                      'h-11 w-11 rounded-full border-2 transition-transform',
                      profile.skinTone === i ? 'scale-110 border-primary ring-2 ring-primary/30' : 'border-border',
                    )}
                    style={{ background: hex }}
                  />
                ))}
              </div>
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
        {learned > 0 && (
          <Section title={t('settings.learned')}>
            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm text-muted">{t('settings.learnedHint', { count: learned })}</p>
              <Button variant="secondary" className="h-10 px-4 text-sm" onClick={resetPrefs}>
                {t('settings.resetLearned')}
              </Button>
            </div>
          </Section>
        )}
        <p className="text-center text-xs text-muted">
          {t('settings.about', { version: __APP_VERSION__ })} ·{' '}
          <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>
        </p>
      </div>
    </Sheet>
  )
}
