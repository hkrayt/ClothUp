import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import type { TFunction } from 'i18next'
import type { Lang, Localized, OccasionId, WeatherContext } from '@/engine/types'
import type { Outfit, OutfitPiece } from '@/engine/outfit-types'
import { DATA } from '@/engine/catalog'
import type { SavedOutfit, SavedPiece } from '@/app/store'
import { colorName } from '@/features/outfit/PaletteCard'
import { fabricName, sortPieces } from '@/features/outfit/OutfitList'

/** The parts of an outfit worth keeping: items, colors, fabrics. */
export function toSaved(outfit: Outfit, ctx: WeatherContext, placeName: Localized, occasion: OccasionId): Omit<SavedOutfit, 'id' | 'savedAt'> {
  return {
    placeName,
    occasion,
    feels: [Math.round(ctx.feelsMin), Math.round(ctx.feelsMax)],
    pieces: outfit.pieces.map((p): SavedPiece => {
      const { item, slot, fabric, carry, color, pattern, patternColor } = p
      return { itemId: item.id, slot, fabric, carry, color, pattern, patternColor }
    }),
  }
}

/** Pieces of a saved outfit; items removed from the catalog since are skipped. */
export function fromSaved(saved: Pick<SavedOutfit, 'pieces'>): OutfitPiece[] {
  return saved.pieces.flatMap(({ itemId, ...rest }) => {
    const item = DATA.items.find((i) => i.id === itemId)
    return item ? [{ ...rest, item }] : []
  })
}

/** Same items and colors, so a saved copy of the current outfit is recognised. */
export function sameOutfit(a: Pick<SavedOutfit, 'pieces'>, b: Pick<SavedOutfit, 'pieces'>): boolean {
  const key = (s: Pick<SavedOutfit, 'pieces'>) =>
    s.pieces
      .map((p) => `${p.itemId}:${p.color ?? ''}`)
      .sort()
      .join('|')
  return key(a) === key(b)
}

/** Plain-text outfit for sharing in a chat. */
export function outfitText(t: TFunction, lang: Lang, saved: Omit<SavedOutfit, 'id' | 'savedAt'>): string {
  const head = t('share.heading', {
    place: saved.placeName[lang],
    occasion: t(`occasion.${saved.occasion}`),
    min: saved.feels[0],
    max: saved.feels[1],
  })
  const lines = sortPieces(fromSaved(saved)).map((p) => {
    const bits = [p.color && colorName(p.color, lang), p.fabric && fabricName(p.fabric, lang)].filter(Boolean).join(', ')
    return `• ${p.item.name[lang]}${bits ? ` (${bits})` : ''}${p.carry ? ` — ${t('outfit.carry')}` : ''}`
  })
  return [head, ...lines, '', t('share.footer')].join('\n')
}

export type ShareResult = 'shared' | 'copied' | 'failed'

/** Clipboard API, or the older select-and-copy for webviews that deny clipboard permission. */
async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    // Inside an open dialog only its own subtree is interactive, so put the textarea there.
    ;(document.querySelector('dialog[open]') ?? document.body).appendChild(area)
    area.select()
    const ok = document.execCommand?.('copy') ?? false
    area.remove()
    return ok
  }
}

/** Native share sheet on Android, the Web Share API where available, otherwise the clipboard. */
export async function shareText(title: string, text: string): Promise<ShareResult> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text, dialogTitle: title })
      return 'shared'
    }
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, text })
      return 'shared'
    }
    return (await copy(text)) ? 'copied' : 'failed'
  } catch (e) {
    // Closing the share sheet is not an error.
    if (e instanceof Error && /cancel|abort/i.test(e.name + e.message)) return 'shared'
    return (await copy(text)) ? 'copied' : 'failed'
  }
}
