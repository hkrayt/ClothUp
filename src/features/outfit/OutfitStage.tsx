import { useTranslation } from 'react-i18next'
import { Backpack, Hand, X } from 'lucide-react'
import type { Lang, Profile } from '@/engine/types'
import type { Outfit, OutfitPiece } from '@/engine/outfit-types'
import { COLORS } from '@/engine/catalog'
import { Character } from '@/features/character/Character'
import { figureScale } from '@/engine/personal'
import { IconButton } from '@/ui'
import { colorName } from './PaletteCard'
import { fabricName } from './OutfitList'

interface OutfitStageProps {
  outfit: Outfit
  profile: Profile
  selected: OutfitPiece | null
  onSelect: (piece: OutfitPiece | null) => void
  /** Optional action rendered in the details panel (e.g. "Change this item"). */
  action?: (piece: OutfitPiece) => React.ReactNode
}

/** The illustrated character with tap-to-inspect details. */
export function OutfitStage({ outfit, profile, selected, onSelect, action }: OutfitStageProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang

  return (
    <div className="relative overflow-hidden rounded-card bg-stage">
      <Character
        pieces={outfit.pieces}
        gender={profile.gender}
        skinTone={profile.skinTone}
        figure={figureScale(profile)}
        lang={lang}
        selectedId={selected?.item.id ?? null}
        onSelect={onSelect}
        label={t('outfit.characterLabel')}
        className="mx-auto block h-[420px] max-h-[58dvh] w-auto pt-4 pb-1 text-text"
      />
      {!selected && (
        <p className="pointer-events-none flex items-center justify-center gap-1.5 pb-3 text-xs text-muted">
          <Hand size={14} aria-hidden />
          {t('outfit.tapHint')}
        </p>
      )}
      {selected && (
        <div className="mx-3 mb-3 rounded-control bg-surface p-3 shadow-card" role="status">
          <div className="flex items-start gap-3">
            {selected.color && (
              <span className="mt-1 h-8 w-8 shrink-0 rounded-full border border-black/10" style={{ background: COLORS.hex(selected.color) }} aria-hidden />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">{selected.item.name[lang]}</span>
              <span className="text-sm text-muted">
                {[selected.color && colorName(selected.color, lang), selected.fabric && fabricName(selected.fabric, lang)].filter(Boolean).join(' · ')}
              </span>
              {selected.fabric && <span className="text-sm">{t(`fabric.why.${selected.fabric}`)}</span>}
              {selected.carry && (
                <span className="mt-1 inline-flex items-center gap-1 text-sm text-muted">
                  <Backpack size={14} aria-hidden />
                  {t('outfit.carryHint')}
                </span>
              )}
              {action && <div className="mt-2">{action(selected)}</div>}
            </div>
            <IconButton label={t('common.close')} onClick={() => onSelect(null)} className="-me-2 -mt-2 h-10 w-10">
              <X size={18} />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  )
}
