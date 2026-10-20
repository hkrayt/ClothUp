import { useMemo } from 'react'
import type { Gender, Style } from '@/engine/types'
import { DATA } from '@/engine/catalog'
import { generateOutfits } from '@/engine/outfit'
import { scenario } from '@/engine/scenarios'
import { Character } from '@/features/character/Character'

const MILD = scenario({ feelsMin: 20, feelsMax: 24, uvMax: 3 })

/** A small character in a typical everyday outfit for a gender and style. */
export function StylePreview({ gender, style }: { gender: Gender; style: Style }) {
  const pieces = useMemo(() => {
    const occasion = DATA.occasions.find((o) => o.id === 'casual')!
    const [o] = generateOutfits(MILD, { gender, style, skinTone: 2 }, occasion, DATA, { count: 1 })
    // Keep the preview about the clothes: no bags or sunglasses.
    return o?.pieces.filter((p) => p.slot !== 'accessory' && p.slot !== 'eyewear') ?? []
  }, [gender, style])
  return <Character pieces={pieces} gender={gender} skinTone={2} lang="en" label="" className="h-[5.5rem] w-auto" />
}
