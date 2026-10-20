import { useTranslation } from 'react-i18next'
import { Backpack, CheckCircle2 } from 'lucide-react'
import type { Lang } from '@/engine/types'
import type { Outfit, OutfitPiece, Slot } from '@/engine/outfit-types'
import { DATA } from '@/engine/catalog'
import { Card } from '@/ui'

/** Head-to-toe reading order for the item list. */
export const SLOT_ORDER: Slot[] = ['head', 'eyewear', 'outer', 'mid', 'top', 'bottom', 'socks', 'shoes', 'accessory']

export function sortPieces(pieces: OutfitPiece[]): OutfitPiece[] {
  return [...pieces].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
}

export function fabricName(id: string, lang: Lang): string {
  return DATA.fabrics.find((f) => f.id === id)?.name[lang] ?? ''
}

function PieceRow({ piece, lang }: { piece: OutfitPiece; lang: Lang }) {
  const { t } = useTranslation()
  const slotLabel = piece.item.fills?.includes('bottom') ? t('slot.onepiece') : t(`slot.${piece.slot}`)
  return (
    <li className="flex flex-col gap-0.5 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{slotLabel}</span>
        {piece.carry && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium">
            <Backpack size={12} aria-hidden />
            {t('outfit.carry')}
          </span>
        )}
      </div>
      <span className="font-semibold">{piece.item.name[lang]}</span>
      {piece.fabric && (
        <span className="text-sm text-muted">
          <span className="font-medium text-text">{fabricName(piece.fabric, lang)}</span> · {t(`fabric.why.${piece.fabric}`)}
        </span>
      )}
    </li>
  )
}

export function OutfitList({ outfit }: { outfit: Outfit }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const pieces = sortPieces(outfit.pieces)
  const wear = pieces.filter((p) => p.slot !== 'accessory')
  const extras = pieces.filter((p) => p.slot === 'accessory')

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="text-lg font-semibold">{t('outfit.items')}</h2>
        <ul className="divide-y divide-border">
          {wear.map((p) => (
            <PieceRow key={`${p.slot}-${p.item.id}`} piece={p} lang={lang} />
          ))}
        </ul>
        {extras.length > 0 && (
          <>
            <h3 className="mt-3 text-sm font-semibold text-muted">{t('outfit.bring')}</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {extras.map((p) => (
                <li key={p.item.id} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium">
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
