/**
 * Dev tool: renders every modest and traditional item on the character to JSON for the review page.
 * Skipped unless REVIEW_OUT is set, e.g. (bash): REVIEW_OUT=/tmp/review.json npx vitest run src/features/character/review.dev.test.tsx
 */
import { it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DATA, COLORS } from '@/engine/catalog'
import { generateOutfits } from '@/engine/outfit'
import { scenario } from '@/engine/scenarios'
import type { OccasionId, Profile } from '@/engine/types'
import { Character } from './Character'
import en from '@/i18n/en.json'
import ar from '@/i18n/ar.json'

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const NEW_IN_V12 = new Set(
  'm-shemagh-black m-thobe-eid f-kaftan f-mules f-strap-sandals f-wool-palazzo f-wool-maxi-skirt f-kimono-abaya f-butterfly-abaya f-jilbab f-hijab-instant f-hijab-turban f-swim-hijab f-burkini f-long-sports-skirt f-long-denim-skirt f-modest-jumpsuit f-modest-blazer f-shirt-dress m-gilet m-linen-blazer m-sweatshirt m-desert-boots m-thermal'.split(' '),
)

it.skipIf(!env.REVIEW_OUT)('renders review data', async () => {
  // Built dynamically so the app's type-check doesn't need Node types for this dev-only file.
  const { writeFileSync } = await import(('node:' + 'fs') as string)
  const items = DATA.items.filter(
    (i) => i.gender.length === 1 && (i.style.includes('modest') || i.style.includes('traditional')) && i.svg.part !== 'none',
  )
  const out = items.map((item) => {
    const profile: Profile = { gender: item.gender[0], style: item.style.includes('modest') ? 'modest' : 'traditional', skinTone: 2 }
    const mid = Math.max(-5, Math.min(38, (item.feels[0] + item.feels[1]) / 2))
    const ctx = scenario({ feelsMin: mid - 2, feelsMax: mid + 2, uvMax: 3 })
    const occasionId = (item.tags.includes('swim') ? 'beach' : item.occasions.find((o) => o !== 'beach') ?? item.occasions[0]) as OccasionId
    const occasion = DATA.occasions.find((o) => o.id === occasionId)!
    const [outfit] = generateOutfits(ctx, profile, occasion, DATA, { locks: { [item.slot]: item.id }, count: 1 })
    const svg = outfit
      ? renderToStaticMarkup(<Character pieces={outfit.pieces} gender={profile.gender} skinTone={2} lang="en" label={item.name.en} />)
      : ''
    const occ = (id: string, t: Record<string, string>) => t[id] ?? id
    return {
      id: item.id,
      isNew: NEW_IN_V12.has(item.id),
      gender: item.gender[0],
      style: profile.style,
      slot: item.slot,
      name: item.name,
      shownFor: { en: occ(occasionId, en.occasion as Record<string, string>), ar: occ(occasionId, ar.occasion as Record<string, string>) },
      occasions: item.occasions.map((o) => occ(o, en.occasion as Record<string, string>)),
      feels: item.feels,
      coverage: item.coverage ?? null,
      tags: item.tags,
      colors: COLORS.allowed(item).slice(0, 10).map((c) => ({ id: c, hex: COLORS.hex(c), name: COLORS.color(c)?.name.en ?? c })),
      svg,
    }
  })
  writeFileSync(env.REVIEW_OUT!, JSON.stringify(out))
  console.log(`wrote ${out.length} items (${out.filter((o) => !o.svg).length} without a drawing)`)
})
