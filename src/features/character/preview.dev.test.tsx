/**
 * Dev tool: renders a set of outfits to a static HTML page (for headless screenshots).
 * A case is "scenario,profile,occasion[,option][,heightCm/weightKg]".
 * Skipped unless PREVIEW_OUT is set, e.g. (bash): PREVIEW_OUT=/tmp/p.html npx vitest run src/features/character/preview.dev.test.tsx
 */
import { it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DATA } from '@/engine/catalog'
import { generateOutfits } from '@/engine/outfit'
import { SCENARIOS } from '@/engine/scenarios'
import type { OccasionId, Profile } from '@/engine/types'
import { figureScale } from '@/engine/personal'
import { Character } from './Character'

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}

const P: Record<string, Profile> = {
  male: { gender: 'male', style: 'standard', skinTone: 1 },
  trad: { gender: 'male', style: 'traditional', skinTone: 3 },
  female: { gender: 'female', style: 'standard', skinTone: 2 },
  modest: { gender: 'female', style: 'modest', skinTone: 0 },
}

const CASES: Array<[keyof typeof SCENARIOS, keyof typeof P, OccasionId, number, string?]> = (env.PREVIEW_CASES ?? '')
  .split(';')
  .filter(Boolean)
  .map((c) => {
    const [s, p, o, n, body] = c.split(',')
    return [s as keyof typeof SCENARIOS, p as keyof typeof P, o as OccasionId, n ? Number(n) : 0, body]
  })

it.skipIf(!env.PREVIEW_OUT)('renders preview page', async () => {
  const { writeFileSync } = await import(('node:' + 'fs') as string)
  const cells = CASES.map(([sc, prof, occ, n = 0, body], i) => {
    const [heightCm, weightKg] = body ? body.split('/').map(Number) : []
    const profile = { ...P[prof], heightCm, weightKg }
    const outfits = generateOutfits(SCENARIOS[sc], profile, DATA.occasions.find((o) => o.id === occ)!, DATA)
    const o = outfits[Math.min(n, outfits.length - 1)]
    let svg = renderToStaticMarkup(<Character pieces={o.pieces} gender={P[prof].gender} skinTone={P[prof].skinTone} figure={figureScale(profile)} lang="en" label="" />)
    // Separate renders reuse ids: make them unique per cell.
    for (const id of new Set([...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1])))
      svg = svg.split(`id="${id}"`).join(`id="c${i}${id}"`).split(`url(#${id})`).join(`url(#c${i}${id})`)
    return `<figure>${svg}<figcaption>${sc} · ${prof} · ${occ}${n ? ' #' + (n + 1) : ''}${body ? ' · ' + body : ''}</figcaption></figure>`
  })
  writeFileSync(
    env.PREVIEW_OUT!,
    `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fafaf7;font:12px system-ui}main{display:grid;grid-template-columns:repeat(${Math.min(4, CASES.length)},1fr);gap:8px;padding:8px}figure{margin:0;background:#f3f1ea;border-radius:12px;padding:6px;text-align:center}svg{height:${env.PREVIEW_H ?? 520}px;width:auto;color:#16181b}</style><main>${cells.join('')}</main>`,
  )
})
