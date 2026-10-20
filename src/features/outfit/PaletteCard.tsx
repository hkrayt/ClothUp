import { useTranslation } from 'react-i18next'
import { Palette as PaletteIcon } from 'lucide-react'
import type { Lang } from '@/engine/types'
import type { PaletteResult } from '@/engine/color'
import { COLORS } from '@/engine/catalog'
import { Card, Swatch } from '@/ui'

export function colorName(id: string, lang: Lang): string {
  return COLORS.color(id)?.name[lang] ?? id
}

export function PaletteCard({ palette }: { palette: PaletteResult }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <PaletteIcon size={20} className="text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">{t('palette.title')}</h2>
        <span className="ms-auto rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
          {t(`palette.strategy.${palette.strategy}`)}
        </span>
      </div>
      <div className="flex flex-wrap justify-start gap-x-5 gap-y-3">
        {palette.swatches.map((s) => (
          <Swatch key={s.color} hex={COLORS.hex(s.color)} name={colorName(s.color, lang)} role={t(`palette.role.${s.role}`)} />
        ))}
      </div>
      <ul className="flex flex-col gap-1 text-sm text-muted">
        {palette.notes.map((n) => {
          // English names go lowercase mid-sentence; {{A}} is the sentence-initial form.
          const names = (n.colors ?? []).map((id) => colorName(id, lang))
          const [a = '', b = '', c = ''] = lang === 'en' ? names.map((s) => s.toLowerCase()) : names
          const A = names[0] ?? ''
          return <li key={n.key}>{t(`palette.note.${n.key}`, { a, b, c, A })}</li>
        })}
      </ul>
    </Card>
  )
}
