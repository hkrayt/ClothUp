import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { DATA } from '@/engine/catalog'
import { generateOutfits } from '@/engine/outfit'
import { SCENARIOS } from '@/engine/scenarios'
import { SAVED_LIMIT, useApp } from '@/app/store'
import { fromSaved, outfitText, sameOutfit, shareText, toSaved } from './saved'

const ctx = SCENARIOS.ammanWinterRain
const [outfit, other] = generateOutfits(ctx, { gender: 'female', style: 'modest', skinTone: 1 }, DATA.occasions.find((o) => o.id === 'casual')!, DATA)
const place = { en: 'Amman', ar: 'عمّان' }

describe('saved outfits', () => {
  beforeEach(() => useApp.setState({ saved: [], closet: { enabled: false, owned: [] } }))

  it('keeps items, colors and fabrics and restores them', () => {
    const s = toSaved(outfit, ctx, place, 'casual')
    expect(s.feels).toEqual([Math.round(ctx.feelsMin), Math.round(ctx.feelsMax)])
    const back = fromSaved(s)
    expect(back.map((p) => [p.item.id, p.color, p.fabric])).toEqual(outfit.pieces.map((p) => [p.item.id, p.color, p.fabric]))
    expect(sameOutfit(s, toSaved(outfit, ctx, place, 'casual'))).toBe(true)
    expect(sameOutfit(s, toSaved(other, ctx, place, 'casual'))).toBe(false)
  })

  it('skips items that no longer exist', () => {
    const s = toSaved(outfit, ctx, place, 'casual')
    expect(fromSaved({ pieces: [...s.pieces, { itemId: 'gone-item', slot: 'top', fabric: '' }] })).toHaveLength(outfit.pieces.length)
  })

  it('saves newest first, removes, and keeps at most the limit', () => {
    const { saveOutfit, removeSaved } = useApp.getState()
    const id = saveOutfit(toSaved(outfit, ctx, place, 'casual'))
    saveOutfit(toSaved(other, ctx, place, 'work'))
    expect(useApp.getState().saved.map((s) => s.occasion)).toEqual(['work', 'casual'])
    removeSaved(id)
    expect(useApp.getState().saved).toHaveLength(1)
    for (let i = 0; i < SAVED_LIMIT + 5; i++) saveOutfit(toSaved(outfit, ctx, place, 'casual'))
    expect(useApp.getState().saved).toHaveLength(SAVED_LIMIT)
  })

  it('marks closet items as owned or not', () => {
    const { setOwned } = useApp.getState()
    setOwned(['b', 'a'], true)
    setOwned(['a'], true)
    expect(useApp.getState().closet.owned).toEqual(['a', 'b'])
    setOwned(['a'], false)
    expect(useApp.getState().closet.owned).toEqual(['b'])
  })
})

describe('sharing', () => {
  it('writes a readable list in both languages', async () => {
    const s = toSaved(outfit, ctx, place, 'casual')
    await i18n.changeLanguage('en')
    const en = outfitText(i18n.t, 'en', s)
    expect(en).toContain('Amman')
    for (const p of outfit.pieces) expect(en).toContain(p.item.name.en)
    await i18n.changeLanguage('ar')
    const ar = outfitText(i18n.t, 'ar', s)
    expect(ar).toContain('عمّان')
    for (const p of outfit.pieces) expect(ar).toContain(p.item.name.ar)
    await i18n.changeLanguage('en')
  })

  it('falls back to the clipboard without a share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    expect(await shareText('t', 'hello')).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('uses the Web Share API when there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    expect(await shareText('t', 'hello')).toBe('shared')
    expect(share).toHaveBeenCalledWith({ title: 't', text: 'hello' })
  })
})
