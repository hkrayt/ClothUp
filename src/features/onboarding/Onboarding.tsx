import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import type { Gender, Profile, Style } from '@/engine/types'
import { useApp } from '@/app/store'
import { useSettings, type Language } from '@/app/settings'
import { Button, IconButton, cx } from '@/ui'
import { Logo } from '@/ui/Logo'
import { StylePreview } from './StylePreview'
import { AboutYou } from '@/features/settings/AboutYou'

type Step = 'language' | 'gender' | 'style' | 'about'

const STYLES: Record<Gender, Style[]> = {
  male: ['standard', 'traditional'],
  female: ['standard', 'modest'],
}

function Choice({ selected, onClick, title, hint, lang, preview }: { selected: boolean; onClick: () => void; title: ReactNode; hint?: ReactNode; lang?: string; preview?: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      lang={lang}
      onClick={onClick}
      className={cx(
        'flex min-h-20 w-full items-center gap-4 rounded-card border-2 bg-surface px-5 py-4 text-start transition-colors',
        selected ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary/50',
      )}
    >
      {preview && (
        <span className="flex h-24 w-14 shrink-0 items-center justify-center overflow-hidden rounded-control bg-stage" aria-hidden>
          {preview}
        </span>
      )}
      <span className="flex flex-1 flex-col">
        <span className="text-lg font-semibold">{title}</span>
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </span>
      <span
        className={cx(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-primary bg-primary text-on-primary' : 'border-border',
        )}
        aria-hidden
      >
        {selected && <Check size={16} strokeWidth={3} />}
      </span>
    </button>
  )
}

/** First-run setup: language → gender → style → optional body details. Asked once; editable later in Settings. */
export function Onboarding() {
  const { t } = useTranslation()
  const { language, setLanguage } = useSettings()
  const setProfile = useApp((s) => s.setProfile)
  const [step, setStep] = useState<Step>('language')
  const [gender, setGender] = useState<Gender | null>(null)
  const [style, setStyle] = useState<Style>('standard')
  const [details, setDetails] = useState<Pick<Profile, 'heightCm' | 'weightKg' | 'age' | 'thermal'>>({})

  const steps: Step[] = ['language', 'gender', 'style', 'about']
  const index = steps.indexOf(step)

  const next = () => {
    if (step === 'language') setStep('gender')
    else if (step === 'gender' && gender) setStep('style')
    else if (step === 'style' && gender) setStep('about')
    else if (step === 'about' && gender) setProfile({ gender, style, skinTone: 2, ...details })
  }

  const pickGender = (g: Gender) => {
    setGender(g)
    setStyle('standard')
  }

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft

  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col px-5">
      <div className="flex h-16 items-center">
        {index > 0 ? (
          <IconButton label={t('common.back')} onClick={() => setStep(steps[index - 1])}>
            <BackIcon size={22} />
          </IconButton>
        ) : (
          <Logo size={36} />
        )}
        <div className="ms-auto flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={s} className={cx('h-2 rounded-full transition-all', i <= index ? 'w-6 bg-primary' : 'w-2 bg-border')} />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 pt-6">
        {step === 'language' && (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{t('onboarding.welcome')}</h1>
              <p className="text-muted">{t('app.tagline')}</p>
            </div>
            <div role="radiogroup" aria-label={t('settings.language')} className="flex flex-col gap-3">
              {(['en', 'ar'] as Language[]).map((l) => (
                <Choice key={l} lang={l} selected={language === l} onClick={() => setLanguage(l)} title={l === 'en' ? 'English' : 'العربية'} />
              ))}
            </div>
          </>
        )}

        {step === 'gender' && (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{t('onboarding.genderTitle')}</h1>
              <p className="text-muted">{t('onboarding.genderHint')}</p>
            </div>
            <div role="radiogroup" aria-label={t('onboarding.genderTitle')} className="flex flex-col gap-3">
              {(['male', 'female'] as Gender[]).map((g) => (
                <Choice key={g} selected={gender === g} onClick={() => pickGender(g)} title={t(`profile.gender.${g}`)} preview={<StylePreview gender={g} style="standard" />} />
              ))}
            </div>
          </>
        )}

        {step === 'style' && gender && (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{t('onboarding.styleTitle')}</h1>
              <p className="text-muted">{t('onboarding.styleHint')}</p>
            </div>
            <div role="radiogroup" aria-label={t('onboarding.styleTitle')} className="flex flex-col gap-3">
              {STYLES[gender].map((s) => (
                <Choice
                  key={s}
                  preview={<StylePreview gender={gender} style={s} />}
                  selected={style === s}
                  onClick={() => setStyle(s)}
                  title={t(`profile.style.${gender}.${s}`)}
                  hint={t(`profile.styleHint.${gender}.${s}`)}
                />
              ))}
            </div>
          </>
        )}

        {step === 'about' && (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{t('onboarding.aboutTitle')}</h1>
              <p className="text-muted">{t('onboarding.aboutHint')}</p>
            </div>
            <AboutYou value={details} onChange={(patch) => setDetails((d) => ({ ...d, ...patch }))} />
          </>
        )}
      </div>

      <Button size="lg" block onClick={next} disabled={step === 'gender' && !gender} className="mb-2 mt-6">
        {step === 'about' ? t('onboarding.done') : t('common.continue')}
      </Button>
    </div>
  )
}

export { STYLES }
