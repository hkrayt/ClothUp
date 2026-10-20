import { useTranslation } from 'react-i18next'
import type { Lang, WeatherContext } from '@/engine/types'
import { formatHour, formatTemp } from '@/lib/format'

const W = 320
const H = 96
const TOP = 18
const BOTTOM = 72

/** Feels-like line with rain-chance bars for each hour of the stay. Night hours are shaded. Mirrors in RTL. */
export function HourlyChart({ series }: { series: WeatherContext['series'] }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const rtl = lang === 'ar'
  if (series.length < 3) return null

  const feels = series.map((s) => s.feels)
  const lo = Math.min(...feels)
  const hi = Math.max(...feels)
  const span = Math.max(4, hi - lo)
  const step = W / series.length
  const xAt = (i: number) => {
    const x = step * i + step / 2
    return rtl ? W - x : x
  }
  const yAt = (v: number) => BOTTOM - ((v - lo) / span) * (BOTTOM - TOP)

  const line = series.map((s, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(s.feels).toFixed(1)}`).join(' ')
  const area = `${line} L${xAt(series.length - 1).toFixed(1)},${BOTTOM} L${xAt(0).toFixed(1)},${BOTTOM} Z`
  const iMax = feels.indexOf(hi)
  const iMin = feels.indexOf(lo)
  const labelEvery = Math.ceil(series.length / 5)
  const summary = `${t('weather.chartLabel')}: ${formatTemp(lo)} – ${formatTemp(hi)}`

  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" role="img" aria-label={summary}>
        {series.map((s, i) =>
          s.isDay ? null : <rect key={`n${i}`} x={xAt(i) - step / 2} y={0} width={step} height={BOTTOM + 2} fill="var(--surface-2)" />,
        )}
        {series.map((s, i) =>
          s.precipProb > 0 ? (
            <rect
              key={`r${i}`}
              x={xAt(i) - step * 0.3}
              y={BOTTOM - (s.precipProb / 100) * 28}
              width={step * 0.6}
              height={(s.precipProb / 100) * 28}
              rx={1.5}
              fill="var(--rain)"
              opacity={0.35}
            />
          ) : null,
        )}
        <path d={area} fill="var(--primary)" opacity={0.1} />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        {[iMax, iMin].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <g key={`p${i}`}>
            <circle cx={xAt(i)} cy={yAt(feels[i])} r={3} fill="var(--surface)" stroke="var(--primary)" strokeWidth={2} />
            <text x={xAt(i)} y={yAt(feels[i]) - 7} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--text)">
              {formatTemp(feels[i])}
            </text>
          </g>
        ))}
        {series.map((s, i) =>
          i % labelEvery === 0 ? (
            <text
              key={`t${i}`}
              x={i === 0 ? (rtl ? W - 1 : 1) : xAt(i)}
              y={H - 4}
              textAnchor={i === 0 ? (rtl ? 'end' : 'start') : 'middle'}
              fontSize={10}
              fill="var(--text-muted)"
            >
              {formatHour(s.time, lang)}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-primary" aria-hidden />
          {t('weather.feels')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rain/40" aria-hidden />
          {t('weather.rainChance')}
        </span>
      </figcaption>
    </figure>
  )
}
