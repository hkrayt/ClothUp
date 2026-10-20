import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Repeat } from 'lucide-react'
import type { OccasionId, Profile, WeatherContext } from '@/engine/types'
import type { ClothingItem, Outfit, OutfitPiece } from '@/engine/outfit-types'
import { DATA } from '@/engine/catalog'
import { applySwap, swapOptions } from '@/engine/outfit'
import { useApp } from '@/app/store'
import { getOccasion } from '@/features/questions/occasions'
import { Button, Card, IconButton, cx } from '@/ui'
import { OutfitList } from './OutfitList'
import { OutfitStage } from './OutfitStage'
import { SwapSheet } from './SwapSheet'
import { useOutfits } from './useOutfits'

interface OutfitSectionProps {
  ctx: WeatherContext
  profile: Profile
  occasion: OccasionId
}

export function OutfitSection({ ctx, profile, occasion }: OutfitSectionProps) {
  const { t, i18n } = useTranslation()
  const rtl = i18n.language === 'ar'
  // Learned preferences are read once per visit so the outfits don't reshuffle while you swap.
  const [prefs] = useState(() => useApp.getState().itemPrefs)
  const recordSwap = useApp((s) => s.recordSwap)
  const base = useOutfits(ctx, profile, occasion, { prefs })
  const [edited, setEdited] = useState<Record<number, Outfit>>({})
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<OutfitPiece | null>(null)
  const [swapping, setSwapping] = useState<OutfitPiece | null>(null)
  const rail = useRef<HTMLDivElement>(null)

  const outfits = base.map((o, i) => edited[i] ?? o)
  const current = outfits[Math.min(index, outfits.length - 1)]

  // Keep the scroll position and the selected option in sync (scrollLeft is negative in RTL).
  const goTo = (i: number) => {
    setIndex(i)
    setSelected(null)
    const el = rail.current
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el?.scrollTo({ left: (rtl ? -1 : 1) * i * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
  }
  const onScroll = () => {
    const el = rail.current
    if (!el) return
    // Only settle on a slide once the scroll has (nearly) stopped on it, so arrow taps aren't overridden mid-animation.
    const exact = Math.abs(el.scrollLeft) / el.clientWidth
    const i = Math.round(exact)
    if (Math.abs(exact - i) < 0.05 && i !== index) {
      setIndex(i)
      setSelected(null)
    }
  }
  useEffect(() => {
    rail.current?.scrollTo({ left: 0 })
  }, [rtl])

  if (!current) {
    return (
      <Card className="py-8 text-center">
        <p className="text-muted">{t('outfit.none')}</p>
      </Card>
    )
  }

  const options = swapping ? swapOptions(ctx, profile, getOccasion(occasion), DATA, current, swapping.slot) : []
  const pick = (item: ClothingItem) => {
    if (!swapping) return
    const next = applySwap(ctx, profile, getOccasion(occasion), DATA, current, swapping.slot, item.id, prefs)
    if (next) {
      setEdited((e) => ({ ...e, [index]: next }))
      recordSwap(swapping.item.id, item.id)
      setSelected(next.pieces.find((p) => p.item.id === item.id) ?? null)
    }
    setSwapping(null)
  }
  const canSwap = (p: OutfitPiece) => p.slot !== 'accessory' && p.slot !== 'eyewear'
  const changeButton = (p: OutfitPiece) =>
    canSwap(p) ? (
      <Button variant="secondary" className="h-10 px-4 text-sm" icon={<Repeat size={16} />} onClick={() => setSwapping(p)}>
        {t('swap.change')}
      </Button>
    ) : null

  const Prev = rtl ? ChevronRight : ChevronLeft
  const Next = rtl ? ChevronLeft : ChevronRight

  return (
    // Phones: one column. Wide windows (desktop): character on the left stays in view, details scroll on the right.
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <div className="flex flex-col gap-4 lg:sticky lg:top-20">
        <div className="relative">
          <div ref={rail} onScroll={onScroll} className="snap-row flex overflow-x-auto" aria-roledescription="carousel">
            {outfits.map((o, i) => (
              <div key={o.id} className="w-full shrink-0" aria-roledescription="slide" aria-label={t('outfit.optionOf', { n: i + 1, total: outfits.length })}>
                <OutfitStage
                  outfit={o}
                  profile={profile}
                  selected={i === index ? selected : null}
                  onSelect={(p) => {
                    if (i !== index) return
                    setSelected(p)
                  }}
                  action={changeButton}
                />
              </div>
            ))}
          </div>
          {outfits.length > 1 && (
            <>
              <IconButton label={t('outfit.previous')} onClick={() => goTo(Math.max(0, index - 1))} disabled={index === 0} className="absolute start-1 top-1/3 bg-surface/80 shadow-sm disabled:opacity-0">
                <Prev size={22} />
              </IconButton>
              <IconButton label={t('outfit.next')} onClick={() => goTo(Math.min(outfits.length - 1, index + 1))} disabled={index === outfits.length - 1} className="absolute end-1 top-1/3 bg-surface/80 shadow-sm disabled:opacity-0">
                <Next size={22} />
              </IconButton>
            </>
          )}
        </div>

        {outfits.length > 1 && (
          <div className="flex items-center justify-center gap-2" role="tablist" aria-label={t('outfit.options')}>
            {outfits.map((o, i) => (
              <button
                key={o.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={t('outfit.option', { n: i + 1 })}
                onClick={() => goTo(i)}
                className="flex h-8 items-center px-1"
              >
                <span className={cx('block h-2.5 rounded-full transition-all', i === index ? 'w-7 bg-primary' : 'w-2.5 bg-border')} />
              </button>
            ))}
          </div>
        )}
      </div>

      <OutfitList outfit={current} onChange={(p) => (canSwap(p) ? setSwapping(p) : undefined)} />
      <SwapSheet piece={swapping} options={options} onPick={pick} onClose={() => setSwapping(null)} />
    </div>
  )
}
