import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bookmark, Share2, Trash2 } from 'lucide-react'
import type { Lang } from '@/engine/types'
import { COLORS } from '@/engine/catalog'
import { figureScale } from '@/engine/personal'
import { useApp, type SavedOutfit } from '@/app/store'
import { Character } from '@/features/character/Character'
import { colorName } from '@/features/outfit/PaletteCard'
import { sortPieces } from '@/features/outfit/OutfitList'
import { formatDay } from '@/lib/format'
import { Button, Sheet } from '@/ui'
import { fromSaved, outfitText, shareText } from './saved'

function SavedSheet({ saved, onClose }: { saved: SavedOutfit; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const profile = useApp((s) => s.profile)!
  const removeSaved = useApp((s) => s.removeSaved)
  const [status, setStatus] = useState<string | null>(null)
  const pieces = fromSaved(saved)

  const share = async () => {
    const result = await shareText(t('share.title'), outfitText(t, lang, saved))
    setStatus(result === 'copied' ? t('share.copied') : result === 'failed' ? t('share.failed') : null)
  }

  return (
    <Sheet open onClose={onClose} title={`${saved.placeName[lang]} · ${t(`occasion.${saved.occasion}`)}`} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-4 py-3">
        <div className="rounded-card bg-stage">
          <Character
            pieces={pieces}
            gender={profile.gender}
            skinTone={profile.skinTone}
            figure={figureScale(profile)}
            lang={lang}
            label={t('outfit.characterLabel')}
            className="mx-auto block h-72 w-auto py-3 text-text"
          />
        </div>
        <p className="text-sm text-muted">{t('saved.feels', { min: saved.feels[0], max: saved.feels[1] })}</p>
        <ul className="flex flex-col gap-2">
          {sortPieces(pieces).map((p) => (
            <li key={`${p.slot}-${p.item.id}`} className="flex items-center gap-2">
              {p.color && <span className="h-4 w-4 shrink-0 rounded-full border border-black/10" style={{ background: COLORS.hex(p.color) }} aria-hidden />}
              <span className="font-medium">{p.item.name[lang]}</span>
              {p.color && <span className="text-sm text-muted">· {colorName(p.color, lang)}</span>}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button variant="secondary" className="h-11 flex-1 text-sm" icon={<Share2 size={18} />} onClick={share}>
            {t('share.button')}
          </Button>
          <Button
            variant="secondary"
            className="h-11 flex-1 text-sm"
            icon={<Trash2 size={18} />}
            onClick={() => {
              removeSaved(saved.id)
              onClose()
            }}
          >
            {t('saved.delete')}
          </Button>
        </div>
        <p className="min-h-5 text-center text-sm text-muted" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </Sheet>
  )
}

/** Saved outfits on the home screen, newest first. */
export function SavedOutfits() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const saved = useApp((s) => s.saved)
  const profile = useApp((s) => s.profile)!
  const [openId, setOpenId] = useState<string | null>(null)
  const open = saved.find((s) => s.id === openId)

  if (saved.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-muted">
        <Bookmark size={16} aria-hidden />
        {t('saved.title')}
      </h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {saved.map((s) => (
          <li key={s.id} className="shrink-0">
            <button
              type="button"
              onClick={() => setOpenId(s.id)}
              className="flex w-28 flex-col items-center gap-1 rounded-card border border-border bg-surface p-2 text-center hover:border-primary"
            >
              <span className="flex h-36 w-full items-center justify-center rounded-control bg-stage" aria-hidden>
                <Character pieces={fromSaved(s)} gender={profile.gender} skinTone={profile.skinTone} figure={figureScale(profile)} lang={lang} label="" className="h-32 w-auto text-text" />
              </span>
              <span className="w-full truncate text-sm font-semibold">{s.placeName[lang]}</span>
              <span className="w-full truncate text-xs text-muted">
                {t(`occasion.${s.occasion}`)} · {formatDay(s.savedAt, lang)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open && <SavedSheet saved={open} onClose={() => setOpenId(null)} />}
    </section>
  )
}
