import { useState } from 'react'
import type { OccasionId, Profile } from '@/engine/types'
import { DATA } from '@/engine/catalog'
import { generateOutfits } from '@/engine/outfit'
import { SCENARIOS } from '@/engine/scenarios'
import { Character } from './Character'

const PROFILES: Profile[] = [
  { gender: 'male', style: 'standard', skinTone: 1 },
  { gender: 'male', style: 'traditional', skinTone: 3 },
  { gender: 'female', style: 'standard', skinTone: 2 },
  { gender: 'female', style: 'modest', skinTone: 0 },
]

const CASES: Array<[keyof typeof SCENARIOS, OccasionId]> = [
  ['aqabaSummer', 'beach'],
  ['mildCloudy', 'eid'],
  ['ammanWinterRain', 'condolence'],
  ['deadSeaSpring', 'shopping'],
  ['ammanWinterRain', 'work'],
  ['ammanSnow', 'casual'],
  ['ammanSpring', 'university'],
  ['aqabaSummer', 'casual'],
  ['wadiRumNight', 'hiking'],
  ['mildCloudy', 'wedding'],
  ['ammanSpring', 'gym'],
  ['sandstorm', 'travel'],
  ['ammanAutumnEvening', 'religious'],
]

/** Dev-only visual check of the character across profiles and scenarios (open with ?gallery). */
export function Gallery() {
  const [selected, setSelected] = useState<string | null>(null)
  // ?gallery=female or ?gallery=modest narrows the profiles shown
  const filter = new URLSearchParams(location.search).get('gallery')
  const profiles = PROFILES.filter((p) => !filter || p.gender === filter || p.style === filter)
  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Character gallery</h1>
      {CASES.map(([sc, occ]) => (
        <section key={`${sc}-${occ}`} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-muted">
            {sc} · {occ}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {profiles.map((p) => {
              const [, second] = generateOutfits(SCENARIOS[sc], p, DATA.occasions.find((x) => x.id === occ)!, DATA)
              const [first] = generateOutfits(SCENARIOS[sc], p, DATA.occasions.find((x) => x.id === occ)!, DATA)
              // ?gallery=...&option=2 shows the second option (the one that can carry a pattern)
              const o = new URLSearchParams(location.search).get('option') === '2' ? (second ?? first) : first
              return (
                <div key={`${p.gender}-${p.style}`} className="rounded-card bg-stage p-2">
                  {o && (
                    <Character
                      pieces={o.pieces}
                      gender={p.gender}
                      skinTone={p.skinTone}
                      lang="en"
                      label={`${p.gender} ${p.style}`}
                      selectedId={selected}
                      onSelect={(x) => setSelected(x?.item.id ?? null)}
                      className="mx-auto h-72"
                    />
                  )}
                  <p className="text-center text-xs text-muted">
                    {p.gender}/{p.style}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
