import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Profile, Thermal } from '@/engine/types'
import { AGE_RANGE, HEIGHT_RANGE, WEIGHT_RANGE } from '@/engine/personal'
import { Segmented } from '@/ui'

type Details = Pick<Profile, 'heightCm' | 'weightKg' | 'age' | 'thermal'>

function NumberField({
  label,
  unit,
  value,
  range,
  onChange,
}: {
  label: string
  unit: string
  value: number | undefined
  range: { min: number; max: number }
  onChange: (v: number | undefined) => void
}) {
  const { t } = useTranslation()
  const [text, setText] = useState(value === undefined ? '' : String(value))
  const n = Number(text)
  const invalid = text.trim() !== '' && (!Number.isFinite(n) || n < range.min || n > range.max)
  const commit = (raw: string) => {
    setText(raw)
    const v = Number(raw)
    if (raw.trim() === '') onChange(undefined)
    else if (Number.isFinite(v) && v >= range.min && v <= range.max) onChange(Math.round(v))
  }
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <span className="flex items-center gap-2 rounded-control border border-border bg-surface-2 px-3 focus-within:border-primary">
        <input
          type="number"
          inputMode="numeric"
          min={range.min}
          max={range.max}
          value={text}
          placeholder="—"
          aria-invalid={invalid}
          onChange={(e) => commit(e.target.value)}
          className="h-12 w-full min-w-0 bg-transparent text-base font-semibold outline-none"
        />
        <span className="text-sm text-muted">{unit}</span>
      </span>
      {invalid && (
        <span className="text-xs text-danger">
          {t('about.range', { min: range.min, max: range.max })}
        </span>
      )}
    </label>
  )
}

/** Optional height, weight, age and "I run cold / hot". Kept on the device only. */
export function AboutYou({ value, onChange }: { value: Details; onChange: (patch: Details) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <NumberField label={t('about.height')} unit={t('about.cm')} value={value.heightCm} range={HEIGHT_RANGE} onChange={(heightCm) => onChange({ heightCm })} />
        <NumberField label={t('about.weight')} unit={t('about.kg')} value={value.weightKg} range={WEIGHT_RANGE} onChange={(weightKg) => onChange({ weightKg })} />
        <NumberField label={t('about.age')} unit={t('about.years')} value={value.age} range={AGE_RANGE} onChange={(age) => onChange({ age })} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('about.thermal')}</span>
        <Segmented<Thermal>
          label={t('about.thermal')}
          value={value.thermal ?? 'normal'}
          onChange={(thermal) => onChange({ thermal })}
          options={(['cold', 'normal', 'hot'] as Thermal[]).map((v) => ({ value: v, label: t(`about.thermals.${v}`) }))}
        />
      </div>
      <p className="text-xs text-muted">{t('about.privacy')}</p>
    </div>
  )
}
