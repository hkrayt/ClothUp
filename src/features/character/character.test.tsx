import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { DATA } from '@/engine/catalog'
import { generateOutfits } from '@/engine/outfit'
import { SCENARIOS } from '@/engine/scenarios'
import type { Profile } from '@/engine/types'
import { RENDERERS } from './parts'
import { Character } from './Character'

describe('character parts', () => {
  it('has a renderer for every svg part used in the catalog', () => {
    for (const item of DATA.items) expect(RENDERERS[item.svg.part], `${item.id}: ${item.svg.part}`).toBeDefined()
  })

  // Renders ~1000 characters, so it needs more than the default 5 s on slower machines and CI.
  it('renders every item of every generated outfit without crashing', { timeout: 60_000 }, () => {
    const profiles: Profile[] = [
      { gender: 'male', style: 'standard', skinTone: 0 },
      { gender: 'male', style: 'traditional', skinTone: 4 },
      { gender: 'female', style: 'standard', skinTone: 2 },
      { gender: 'female', style: 'modest', skinTone: 3 },
    ]
    for (const ctx of Object.values(SCENARIOS))
      for (const p of profiles)
        for (const occ of DATA.occasions)
          for (const o of generateOutfits(ctx, p, occ, DATA)) {
            const { container, unmount } = render(<Character pieces={o.pieces} gender={p.gender} skinTone={p.skinTone} lang="en" label="x" onSelect={() => {}} />)
            const paths = [...container.querySelectorAll('path')].map((el) => el.getAttribute('d') ?? '')
            expect(paths.some((d) => d.includes('NaN')), `${p.style} ${occ.id}`).toBe(false)
            // Every drawable piece is an interactive group
            const drawn = o.pieces.filter((x) => x.item.svg.part !== 'none').length
            expect(container.querySelectorAll('[role="button"]').length).toBeGreaterThanOrEqual(drawn)
            unmount()
          }
  })
})
