import type { Condition, Rule, RuleEffect, Slot } from './outfit-types'

export type Facts = Record<string, unknown>

type Test = { gte?: number; lte?: number; gt?: number; lt?: number; eq?: unknown; in?: unknown[]; nin?: unknown[]; ne?: unknown }

function testValue(value: unknown, test: Test): boolean {
  if (test.eq !== undefined && value !== test.eq) return false
  if (test.ne !== undefined && value === test.ne) return false
  if (test.in !== undefined && !test.in.includes(value)) return false
  if (test.nin !== undefined && test.nin.includes(value)) return false
  if (typeof value === 'number') {
    if (test.gte !== undefined && !(value >= test.gte)) return false
    if (test.lte !== undefined && !(value <= test.lte)) return false
    if (test.gt !== undefined && !(value > test.gt)) return false
    if (test.lt !== undefined && !(value < test.lt)) return false
  } else if ([test.gte, test.lte, test.gt, test.lt].some((x) => x !== undefined)) {
    // Numeric comparison on a missing/non-numeric value (e.g. dust unavailable) never matches.
    return false
  }
  return true
}

/** True when every field test passes and, if present, at least one `any` branch matches. */
export function matches(cond: Condition, facts: Facts): boolean {
  for (const [field, test] of Object.entries(cond)) {
    if (field === 'any') {
      const branches = test as Condition[]
      if (!branches.some((c) => matches(c, facts))) return false
      continue
    }
    if (!testValue(facts[field], test as Test)) return false
  }
  return true
}

/** The merged effect of all matching rules, plus the matched rules (highest priority first). */
export interface Effects {
  matched: Rule[]
  need: Set<Slot>
  /** Requirements in priority order; each is "slot item must have one of these tags". */
  require: Array<{ slot: Slot; tags: string[]; priority: number }>
  exclude: Set<string>
  prefer: Map<string, number>
  preferFabrics: Map<string, number>
  add: string[]
  carry: Set<Slot>
}

export function collectEffects(rules: Rule[], facts: Facts): Effects {
  const matched = rules.filter((r) => matches(r.when, facts)).sort((a, b) => b.priority - a.priority)
  const fx: Effects = {
    matched,
    need: new Set(),
    require: [],
    exclude: new Set(),
    prefer: new Map(),
    preferFabrics: new Map(),
    add: [],
    carry: new Set(),
  }
  const addAll = <T>(set: Set<T>, xs?: T[]) => xs?.forEach((x) => set.add(x))
  const sumInto = (map: Map<string, number>, rec?: Record<string, number>) =>
    rec && Object.entries(rec).forEach(([k, v]) => map.set(k, (map.get(k) ?? 0) + v))

  for (const r of matched) {
    const t: RuleEffect = r.then
    addAll(fx.need, t.need)
    addAll(fx.exclude, t.exclude)
    addAll(fx.carry, t.carry)
    sumInto(fx.prefer, t.prefer)
    sumInto(fx.preferFabrics, t.preferFabrics)
    for (const [slot, tags] of Object.entries(t.require ?? {})) fx.require.push({ slot: slot as Slot, tags: tags!, priority: r.priority })
    for (const a of t.add ?? []) if (!fx.add.includes(a)) fx.add.push(a)
  }
  return fx
}
