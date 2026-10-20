import { describe, expect, it } from 'vitest'
import en from './en.json'
import ar from './ar.json'

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

describe('translations', () => {
  it('Arabic has every English key and nothing extra', () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort())
  })

  it('keeps the same {{placeholders}}', () => {
    const flat = (o: object) => Object.fromEntries(keys(o).map((k) => [k, k.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown>)[p], o)]))
    const fe = flat(en)
    const fa = flat(ar)
    const ph = (s: unknown) => (String(s).match(/{{\w+}}/g) ?? []).sort()
    for (const k of Object.keys(fe)) expect(ph(fa[k]), k).toEqual(ph(fe[k]))
  })
})
