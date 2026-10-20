import { useMemo } from 'react'
import type { OccasionId, Profile, WeatherContext } from '@/engine/types'
import type { GenerateOptions } from '@/engine/outfit'
import { generateOutfits } from '@/engine/outfit'
import { DATA } from '@/engine/catalog'
import { getOccasion } from '@/features/questions/occasions'

export function useOutfits(ctx: WeatherContext, profile: Profile, occasion: OccasionId, opts: GenerateOptions = {}) {
  const key = JSON.stringify(opts)
  return useMemo(
    () => generateOutfits(ctx, profile, getOccasion(occasion), DATA, opts),
    // opts is compared by value via `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, profile, occasion, key],
  )
}
