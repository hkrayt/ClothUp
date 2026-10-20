import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OccasionId, Profile, WeatherContext } from '@/engine/types'
import { Card, Segmented } from '@/ui'
import { OutfitList } from './OutfitList'
import { useOutfits } from './useOutfits'

interface OutfitSectionProps {
  ctx: WeatherContext
  profile: Profile
  occasion: OccasionId
}

export function OutfitSection({ ctx, profile, occasion }: OutfitSectionProps) {
  const { t } = useTranslation()
  const outfits = useOutfits(ctx, profile, occasion)
  const [index, setIndex] = useState('0')

  if (outfits.length === 0) {
    return (
      <Card className="py-8 text-center">
        <p className="text-muted">{t('outfit.none')}</p>
      </Card>
    )
  }

  const current = outfits[Math.min(Number(index), outfits.length - 1)]
  return (
    <div className="flex flex-col gap-4">
      {outfits.length > 1 && (
        <Segmented
          label={t('outfit.options')}
          value={index}
          onChange={setIndex}
          options={outfits.map((_, i) => ({ value: String(i), label: t('outfit.option', { n: i + 1 }) }))}
        />
      )}
      <OutfitList outfit={current} />
    </div>
  )
}
