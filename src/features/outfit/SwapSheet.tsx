import { useTranslation } from 'react-i18next'
import { ArrowLeftRight } from 'lucide-react'
import type { Lang } from '@/engine/types'
import type { ClothingItem, OutfitPiece } from '@/engine/outfit-types'
import { COLORS } from '@/engine/catalog'
import { Sheet } from '@/ui'
import { fabricName } from './OutfitList'

interface SwapSheetProps {
  piece: OutfitPiece | null
  options: ClothingItem[]
  onPick: (item: ClothingItem) => void
  onClose: () => void
}

/** "Change this item": other pieces that suit the same weather and occasion. */
export function SwapSheet({ piece, options, onPick, onClose }: SwapSheetProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang

  return (
    <Sheet
      open={!!piece}
      onClose={onClose}
      title={piece ? t('swap.title', { item: piece.item.name[lang] }) : ''}
      closeLabel={t('common.close')}
    >
      <div className="flex flex-col gap-1 pb-3">
        {options.length === 0 && <p className="py-6 text-center text-muted">{t('swap.none')}</p>}
        {options.map((item) => {
          const swatch = COLORS.allowed(item).slice(0, 4)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item)}
              className="flex min-h-16 items-center gap-3 rounded-control px-3 py-2 text-start hover:bg-surface-2"
            >
              <span className="flex -space-x-1.5 rtl:space-x-reverse" aria-hidden>
                {swatch.map((c) => (
                  <span key={c} className="h-5 w-5 rounded-full border-2 border-surface" style={{ background: COLORS.hex(c) }} />
                ))}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{item.name[lang]}</span>
                <span className="truncate text-sm text-muted">{item.fabrics.map((f) => fabricName(f, lang)).join(' · ')}</span>
              </span>
              <ArrowLeftRight size={18} className="shrink-0 text-muted" aria-hidden />
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
