import { describe, expect, it } from 'vitest'
import en from './en.json'
import ar from './ar.json'
import { DATA } from '@/engine/catalog'

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

describe('translations', () => {
  it('Arabic has every English key and nothing extra', () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort())
  })

  it('has text for every rule reason, fabric and occasion', () => {
    const reasons = en.reason as Record<string, string>
    for (const r of DATA.rules) if (r.reason) expect(reasons[r.reason], r.id).toBeDefined()
    for (const k of ['carryLayer', 'layers', 'mild']) expect(reasons[k]).toBeDefined()
    const why = en.fabric.why as Record<string, string>
    for (const f of DATA.fabrics) expect(why[f.id], f.id).toBeDefined()
    const occ = en.occasion as Record<string, string>
    for (const o of DATA.occasions) expect(occ[o.id], o.id).toBeDefined()
  })

  it('keeps the same {{placeholders}}', () => {
    const flat = (o: object) => Object.fromEntries(keys(o).map((k) => [k, k.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown>)[p], o)]))
    const fe = flat(en)
    const fa = flat(ar)
    const ph = (s: unknown) => (String(s).match(/{{\w+}}/g) ?? []).sort()
    for (const k of Object.keys(fe)) expect(ph(fa[k]), k).toEqual(ph(fe[k]))
  })
})
