import { useTranslation } from 'react-i18next'
import { Backpack, CheckCircle2, Repeat } from 'lucide-react'
import type { Lang } from '@/engine/types'
import type { Outfit, OutfitPiece, Slot } from '@/engine/outfit-types'
import { COLORS, DATA } from '@/engine/catalog'
import { Card, IconButton } from '@/ui'
import { colorName, PaletteCard } from './PaletteCard'

/** Head-to-toe reading order for the item list. */
export const SLOT_ORDER: Slot[] = ['head', 'eyewear', 'outer', 'mid', 'top', 'bottom', 'socks', 'shoes', 'accessory']

export function sortPieces(pieces: OutfitPiece[]): OutfitPiece[] {
  return [...pieces].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
}

export function fabricName(id: string, lang: Lang): string {
  return DATA.fabrics.find((f) => f.id === id)?.name[lang] ?? ''
}

function PieceRow({ piece, lang, onChange }: { piece: OutfitPiece; lang: Lang; onChange?: (p: OutfitPiece) => void }) {
  const { t } = useTranslation()
  const slotLabel = piece.item.fills?.includes('bottom') ? t('slot.onepiece') : t(`slot.${piece.slot}`)
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{slotLabel}</span>
        {piece.carry && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium">
            <Backpack size={12} aria-hidden />
            {t('outfit.carry')}
          </span>
        )}
      </div>
      <span className="flex items-center gap-2 font-semibold">
        {piece.color && (
          <span
            className="h-4 w-4 shrink-0 rounded-full border border-black/10 dark:border-white/20"
            style={{ background: COLORS.hex(piece.color) }}
            aria-hidden
          />
        )}
        <span>
          {piece.item.name[lang]}
          {piece.color && <span className="font-normal text-muted"> · {colorName(piece.color, lang)}</span>}
        </span>
      </span>
      {piece.fabric && (
        <span className="text-sm text-muted">
          <span className="font-medium text-text">{fabricName(piece.fabric, lang)}</span> · {t(`fabric.why.${piece.fabric}`)}
        </span>
      )}
      </div>
      {onChange && piece.slot !== 'eyewear' && (
        <IconButton label={t('swap.changeItem', { item: piece.item.name[lang] })} onClick={() => onChange(piece)} className="h-10 w-10 shrink-0 text-muted">
          <Repeat size={18} />
        </IconButton>
      )}
    </li>
  )
}

export function OutfitList({ outfit, onChange }: { outfit: Outfit; onChange?: (p: OutfitPiece) => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const pieces = sortPieces(outfit.pieces)
  const wear = pieces.filter((p) => p.slot !== 'accessory')
  const extras = pieces.filter((p) => p.slot === 'accessory')

  return (
    <div className="flex flex-col gap-4">
      {outfit.palette && <PaletteCard palette={outfit.palette} />}
      <Card>
        <h2 className="text-lg font-semibold">{t('outfit.items')}</h2>
        <ul className="divide-y divide-border">
          {wear.map((p) => (
            <PieceRow key={`${p.slot}-${p.item.id}`} piece={p} lang={lang} onChange={onChange} />
          ))}
        </ul>
        {extras.length > 0 && (
          <>
            <h3 className="mt-3 text-sm font-semibold text-muted">{t('outfit.bring')}</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {extras.map((p) => (
                <li key={p.item.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium">
                  {p.color && (
                    <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: COLORS.hex(p.color) }} aria-hidden />
                  )}
                  {p.item.name[lang]}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold">{t('outfit.why')}</h2>
        <ul className="flex flex-col gap-2">
          {outfit.reasons.map((r) => (
            <li key={r.key} className="flex items-start gap-2">
              <CheckCircle2 size={18} className="mt-1 shrink-0 text-primary" aria-hidden />
              <span>{t(`reason.${r.key}`, r.params)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
