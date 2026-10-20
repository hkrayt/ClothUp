/**
 * Dev tool for tuning the catalog and rules. Skipped unless CASES is set, e.g. (PowerShell):
 *   $env:CASES="aqabaSummer,modest,casual;ammanSnow,male,work"; npx vitest run src/engine/print.test.ts --reporter=dot
 * Scenario names come from scenarios.ts; profiles: male, trad, female, modest.
 */
import { it } from 'vitest'
import { DATA } from './catalog'
import { generateOutfits } from './outfit'
import { SCENARIOS } from './scenarios'
import type { OccasionId, Profile } from './types'

const PROFILES: Record<string, Profile> = {
  male: { gender: 'male', style: 'standard', skinTone: 2 },
  trad: { gender: 'male', style: 'traditional', skinTone: 2 },
  female: { gender: 'female', style: 'standard', skinTone: 2 },
  modest: { gender: 'female', style: 'modest', skinTone: 2 },
}

type Case = [keyof typeof SCENARIOS, string, OccasionId]
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const cases: Case[] = (env.CASES ?? '')
  .split(';')
  .filter(Boolean)
  .map((c: string) => c.split(',') as Case)

it.skipIf(cases.length === 0)('prints outfits', () => {
  for (const [sc, prof, occ] of cases) {
    const outfits = generateOutfits(SCENARIOS[sc], PROFILES[prof], DATA.occasions.find((o) => o.id === occ)!, DATA)
    console.log(`\n== ${sc} / ${prof} / ${occ} (${outfits.length})`)
    for (const o of outfits)
      console.log(
        ` [${o.score.toFixed(1)}] ${o.palette?.id}\n   ` +
          o.pieces.map((p) => `${p.slot}:${p.item.id}${p.carry ? '(carry)' : ''}/${p.fabric}/${p.color ?? '-'}`).join('  '),
      )
    console.log('  reasons:', outfits[0]?.reasons.map((r) => r.key).join(', '))
  }
})
