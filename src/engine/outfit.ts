import type { ClothingItem, Outfit, OutfitPiece, Reason, Slot } from './outfit-types'
import type { Occasion, Profile, WeatherContext } from './types'
import type { EngineData } from './catalog'
import { collectEffects, type Effects, type Facts } from './rules'

export interface GenerateOptions {
  /** Item id â†’ score bonus learned from the user's swaps. */
  prefs?: Record<string, number>
  /** Force a specific item in a slot (used by "change this item"). */
  locks?: Partial<Record<Slot, string>>
  /** Number of distinct outfits to return (default 3). */
  count?: number
}

interface Scored {
  item: ClothingItem
  score: number
}

/** Shared state for one generation run. */
interface Run {
  ctx: WeatherContext
  profile: Profile
  occasion: Occasion
  data: EngineData
  fx: Effects
  opts: GenerateOptions
  armsLong: boolean
  legsLong: boolean
}

const MAIN_SLOTS: Slot[] = ['top', 'bottom', 'outer', 'shoes']

const has = (item: ClothingItem, tag: string) => item.tags.includes(tag)
const hasAny = (item: ClothingItem, tags: string[]) => tags.some((t) => item.tags.includes(t))
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

// ---------- filtering ----------

function coverageOk(run: Run, item: ClothingItem): boolean {
  const c = item.coverage
  if (!c) return true
  if (run.armsLong && c.arms && c.arms !== 'long' && ['top', 'mid', 'outer'].includes(item.slot)) return false
  const coversLegs = item.slot === 'bottom' || item.fills?.includes('bottom')
  if (run.legsLong && coversLegs && c.legs && c.legs !== 'long') return false
  return true
}

/** Items for a slot in a given style that fit the profile, occasion, exclusions and coverage. */
function basePool(run: Run, slot: Slot, style: string): ClothingItem[] {
  const { profile, occasion, fx, data } = run
  return data.items.filter(
    (i) =>
      i.slot === slot &&
      i.gender.includes(profile.gender) &&
      i.style.includes(style as never) &&
      i.occasions.includes(occasion.id) &&
      !i.tags.some((t) => fx.exclude.has(t)) &&
      coverageOk(run, i),
  )
}

const wearable = (target: number | undefined) => (i: ClothingItem) =>
  target === undefined || Number.isFinite(temperatureFit(target, i.feels))

/**
 * Applies rule requirements in priority order. A requirement that no wearable item can meet
 * (e.g. "closed shoes" when the only closed formal shoes are winter boots in 30 Â°C) is relaxed.
 */
function applyRequirements(run: Run, slot: Slot, items: ClothingItem[], target?: number): ClothingItem[] {
  let out = items
  for (const req of run.fx.require) {
    if (req.slot !== slot) continue
    const filtered = out.filter((i) => hasAny(i, req.tags))
    if (filtered.some(wearable(target))) out = filtered
  }
  return out
}

/** Candidates for a slot. If the user's style has nothing wearable in this weather, standard-style items are used. */
function pool(run: Run, slot: Slot, target?: number): ClothingItem[] {
  const lock = run.opts.locks?.[slot]
  if (lock) {
    const locked = run.data.items.find((i) => i.id === lock && i.slot === slot)
    if (locked) return [locked]
  }
  const own = applyRequirements(run, slot, basePool(run, slot, run.profile.style), target)
  if (run.profile.style === 'standard' || own.some(wearable(target))) return own
  const fallback = applyRequirements(run, slot, basePool(run, slot, 'standard'), target)
  return fallback.some(wearable(target)) ? [...own, ...fallback] : own
}

// ---------- scoring ----------

/** Up to +2 inside the comfortable range (best at its centre), âˆ’1.5 per Â°C outside, unusable beyond 8 Â°C. */
export function temperatureFit(target: number, [lo, hi]: [number, number]): number {
  if (target >= lo && target <= hi) {
    const mid = (lo + hi) / 2
    const half = Math.max(1, (hi - lo) / 2)
    return 2 * (1 - Math.abs(target - mid) / half) + 0.5
  }
  const dist = target < lo ? lo - target : target - hi
  return dist > 8 ? -Infinity : -1.5 * dist
}

function formalityFit(f: number, [lo, hi]: [number, number]): number {
  if (f >= lo && f <= hi) return 1
  return -1.5 * (f < lo ? lo - f : f - hi)
}

function bestFabricBonus(run: Run, item: ClothingItem): number {
  if (item.fabrics.length === 0) return 0
  return Math.max(...item.fabrics.map((f) => run.fx.preferFabrics.get(f) ?? 0))
}

function itemScore(run: Run, item: ClothingItem, target: number, formalityWeight = 1): number {
  let s = temperatureFit(target, item.feels)
  s += formalityWeight * formalityFit(item.formality, run.occasion.formality)
  for (const t of item.tags) s += run.fx.prefer.get(t) ?? 0
  s += bestFabricBonus(run, item)
  s += run.opts.prefs?.[item.id] ?? 0
  return s
}

function rank(run: Run, items: ClothingItem[], target: number, formalityWeight = 1): Scored[] {
  return items
    .map((item) => ({ item, score: itemScore(run, item, target, formalityWeight) }))
    .filter((s) => Number.isFinite(s.score))
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
}

/** Penalizes outfits whose pieces are far apart in formality, e.g. a suit jacket with joggers. */
function coherence(a: ClothingItem, b: ClothingItem): number {
  const diff = Math.abs(a.formality - b.formality)
  let s = diff > 2 ? -(diff - 2) * 2 : 0
  if (has(a, 'denim') && has(b, 'denim')) s -= 2
  if ((has(a, 'suit') && !has(b, 'tailored') && b.slot === 'bottom') || (has(b, 'suit') && !has(a, 'tailored') && a.slot === 'bottom'))
    s -= 6
  if (has(a, 'abaya') && has(b, 'abaya')) s -= 20
  if ((has(a, 'thobe') && has(b, 'sporty')) || (has(b, 'thobe') && has(a, 'sporty'))) s -= 6
  return s
}

// ---------- assembly ----------

interface Plan {
  needOuter: boolean
  carryOuter: boolean
  needMid: boolean
  targets: Record<Slot, number>
}

function layerPlan(run: Run): Plan {
  const { ctx, fx } = run
  const needOuter = fx.need.has('outer') || ctx.feelsMin < 17
  // Only cold for part of the stay (evening, early morning): take the layer along.
  const carryOuter = needOuter && !fx.need.has('outer') && ctx.feelsAvg >= 19
  const needMid = ctx.feelsMin < 9 || ctx.feelsAvg < 12
  const layered = (needOuter && !carryOuter) || needMid
  // Mostly-indoor occasions pull the clothes under the coat toward room temperature (~22 °C).
  const indoor = run.occasion.indoor ?? 0
  const room = (t: number) => t * (1 - indoor) + 22 * indoor
  const avg = room(ctx.feelsAvg)
  return {
    needOuter,
    carryOuter,
    needMid,
    targets: {
      top: layered ? clamp(avg + 8, 14, 24) : avg,
      bottom: avg,
      mid: room((ctx.feelsMin + ctx.feelsAvg) / 2),
      outer: ctx.feelsMin,
      shoes: (ctx.feelsMin + ctx.feelsAvg) / 2,
      socks: (ctx.feelsMin + ctx.feelsAvg) / 2,
      head: avg,
      eyewear: avg,
      accessory: avg,
    },
  }
}

function pickFabric(run: Run, item: ClothingItem): string {
  if (item.fabrics.length <= 1) return item.fabrics[0] ?? ''
  const { ctx, fx, data } = run
  const warmth = (id: string) => data.fabrics.find((f) => f.id === id)?.warmth ?? 2
  const score = (id: string) => {
    let s = fx.preferFabrics.get(id) ?? 0
    if (ctx.feelsMax >= 26) s -= warmth(id)
    else if (ctx.feelsMin <= 12) s += warmth(id)
    return s
  }
  return [...item.fabrics].sort((a, b) => score(b) - score(a))[0]
}

function chooseSocks(run: Run, shoes: ClothingItem, lower: ClothingItem, target: number): ClothingItem | null {
  if (hasAny(shoes, ['sandals', 'open-toe'])) return null
  const candidates = pool(run, 'socks', target)
  const bareLegs = hasAny(lower, ['skirt', 'dress']) && run.profile.style === 'standard'
  if (bareLegs && target <= 14) return candidates.find((i) => has(i, 'tights')) ?? null
  // Flats, loafers and heels are worn without visible socks when it's warm.
  if (hasAny(shoes, ['heels', 'slip-on']) && (bareLegs || target >= 20)) return null
  const ranked = rank(
    run,
    candidates.filter((i) => !has(i, 'tights')),
    target,
    0.4,
  )
  // Formal shoes want dress socks; trainers want sports/ankle socks â€” encoded in occasions + formality.
  const withShoe = ranked.map((s) => ({ ...s, score: s.score + coherence(s.item, shoes) }))
  withShoe.sort((a, b) => b.score - a.score)
  return withShoe[0]?.item ?? null
}

function resolveAdds(run: Run, chosen: ClothingItem[]): ClothingItem[] {
  const accessories = pool(run, 'accessory')
  const out: ClothingItem[] = []
  const take = (i: ClothingItem | undefined) => {
    if (i && !out.includes(i)) out.push(i)
  }
  const explicit = run.fx.add.filter((a) => !a.startsWith('#'))
  for (const id of explicit) take(accessories.find((i) => i.id === id))
  for (const tagRef of run.fx.add.filter((a) => a.startsWith('#'))) {
    const tag = tagRef.slice(1)
    if (tag === 'bag' && out.some((i) => has(i, 'bag'))) continue
    // A shemagh on the head already protects the face from dust.
    if (tag === 'dust-protect' && chosen.some((i) => has(i, 'shemagh'))) continue
    const ranked = rank(run, accessories.filter((i) => has(i, tag)), run.ctx.feelsAvg, 1)
    take(ranked[0]?.item)
  }
  // One scarf is enough: prefer the face scarf when there's dust.
  if (out.some((i) => i.id === 'face-scarf')) return out.filter((i) => i.id !== 'scarf')
  return out
}

function assemble(run: Run, plan: Plan, top: ClothingItem, bottom: ClothingItem | null, base: number): Outfit | null {
  const pieces: OutfitPiece[] = []
  let score = base
  const lower = bottom ?? top
  const add = (slot: Slot, item: ClothingItem, carry = false) =>
    pieces.push({ slot, item, fabric: pickFabric(run, item), ...(carry ? { carry } : {}) })

  add('top', top)
  if (bottom) add('bottom', bottom)

  const pairCoherence = (i: ClothingItem) => coherence(i, top) + (bottom ? coherence(i, bottom) : 0)

  if (plan.needOuter || run.opts.locks?.outer) {
    const outers = rank(run, pool(run, 'outer', plan.targets.outer), plan.targets.outer)
      .map((s) => ({ ...s, score: s.score + pairCoherence(s.item) }))
      .sort((a, b) => b.score - a.score)
    if (outers[0]) {
      add('outer', outers[0].item, plan.carryOuter)
      score += outers[0].score
    } else if (run.fx.need.has('outer') || run.ctx.feelsMin < 10) {
      return null
    }
  }

  const traditionalBase = hasAny(top, ['thobe', 'abaya'])
  if ((plan.needMid && !traditionalBase) || run.opts.locks?.mid) {
    const outer = pieces.find((p) => p.slot === 'outer')?.item
    const mids = rank(run, pool(run, 'mid', plan.targets.mid), plan.targets.mid)
      .map((s) => ({ ...s, score: s.score + pairCoherence(s.item) + (outer ? coherence(s.item, outer) : 0) }))
      .sort((a, b) => b.score - a.score)
    if (mids[0]) {
      add('mid', mids[0].item)
      score += mids[0].score * 0.5
    }
  }

  const shoes = rank(run, pool(run, 'shoes', plan.targets.shoes), plan.targets.shoes)
    .map((s) => ({ ...s, score: s.score + pairCoherence(s.item) }))
    .sort((a, b) => b.score - a.score)[0]
  if (!shoes) return null
  add('shoes', shoes.item)
  score += shoes.score

  const socks = chooseSocks(run, shoes.item, lower, plan.targets.socks)
  if (socks) add('socks', socks)

  if (run.fx.need.has('head') || run.opts.locks?.head) {
    const head = rank(run, pool(run, 'head', plan.targets.head), plan.targets.head, 0.5)
      .map((s) => ({ ...s, score: s.score + pairCoherence(s.item) * 0.5 }))
      .sort((a, b) => b.score - a.score)[0]
    if (head) add('head', head.item)
    else if (run.profile.style === 'modest') return null
  }

  if (run.fx.add.includes('sunglasses')) {
    const glasses = pool(run, 'eyewear')[0]
    if (glasses) add('eyewear', glasses)
  }

  for (const acc of resolveAdds(run, pieces.map((p) => p.item))) add('accessory', acc)

  return { id: '', pieces, score, reasons: [] }
}

function signature(o: Outfit): Partial<Record<Slot, string>> {
  return Object.fromEntries(o.pieces.filter((p) => MAIN_SLOTS.includes(p.slot)).map((p) => [p.slot, p.item.id]))
}

/** How many of top/bottom/outer/shoes differ between two outfits. */
function differences(a: Outfit, b: Outfit): number {
  const sa = signature(a)
  const sb = signature(b)
  return MAIN_SLOTS.filter((s) => sa[s] !== sb[s]).length
}

// ---------- reasons ----------

function buildReasons(run: Run, plan: Plan): Reason[] {
  const { ctx } = run
  const r = (n: number) => Math.round(n)
  const params: Record<string, Record<string, number>> = {
    rain: { p: ctx.rainProb },
    cold: { min: r(ctx.feelsMin) },
    snow: { min: r(ctx.feelsMin) },
    hot: { max: r(ctx.feelsMax) },
    extremeHeat: { max: r(ctx.feelsMax) },
    uv: { uv: r(ctx.uvMax) },
    windy: { gust: ctx.gust },
  }
  const reasons: Reason[] = []
  const seen = new Set<string>()
  const push = (key: string, p?: Record<string, number>) => {
    if (seen.has(key)) return
    seen.add(key)
    reasons.push(p ? { key, params: p } : { key })
  }

  if (plan.carryOuter) push('carryLayer', { min: r(ctx.feelsMin) })
  else if (plan.needOuter && plan.needMid) push('layers', { min: r(ctx.feelsMin), max: r(ctx.feelsMax) })

  // Weather first (safety/comfort), then occasion and style.
  const withReason = run.fx.matched.filter((m) => m.reason)
  const weather = withReason.filter((m) => m.group !== 'occasion')
  const occasion = withReason.filter((m) => m.group === 'occasion')
  if (weather.length === 0) push('mild', { min: r(ctx.feelsMin), max: r(ctx.feelsMax) })
  for (const m of [...weather, ...occasion]) push(m.reason!, params[m.reason!])
  return reasons
}

// ---------- entry point ----------

export function facts(ctx: WeatherContext, profile: Profile, occasion: Occasion): Facts {
  return { ...ctx, gender: profile.gender, style: profile.style, occasion: occasion.id }
}

/** Generates up to `count` distinct complete outfits, best first. */
export function generateOutfits(
  ctx: WeatherContext,
  profile: Profile,
  occasion: Occasion,
  data: EngineData,
  opts: GenerateOptions = {},
): Outfit[] {
  const fx = collectEffects(data.rules, facts(ctx, profile, occasion))
  const run: Run = {
    ctx,
    profile,
    occasion,
    data,
    fx,
    opts,
    armsLong: profile.style === 'modest' || (occasion.id === 'religious' && profile.gender === 'female'),
    legsLong: profile.style === 'modest' || occasion.id === 'religious',
  }
  const plan = layerPlan(run)

  const tops = rank(run, pool(run, 'top', plan.targets.top), plan.targets.top).slice(0, 7)
  const bottoms = rank(run, pool(run, 'bottom', plan.targets.bottom), plan.targets.bottom).slice(0, 7)

  const pairs: Array<{ top: ClothingItem; bottom: ClothingItem | null; score: number }> = []
  for (const t of tops) {
    if (t.item.fills?.includes('bottom')) {
      if (run.opts.locks?.bottom) continue
      // A one-piece is scored against the bottom target too, so it counts for both slots.
      const legFit = temperatureFit(plan.targets.bottom, t.item.feels)
      if (Number.isFinite(legFit)) pairs.push({ top: t.item, bottom: null, score: t.score * 2 + legFit * 0.25 })
      continue
    }
    for (const b of bottoms) pairs.push({ top: t.item, bottom: b.item, score: t.score + b.score + coherence(t.item, b.item) })
  }
  pairs.sort((a, b) => b.score - a.score)

  const outfits: Outfit[] = []
  for (const p of pairs.slice(0, 12)) {
    const o = assemble(run, plan, p.top, p.bottom, p.score)
    if (o) outfits.push(o)
  }
  outfits.sort((a, b) => b.score - a.score)

  // Prefer alternatives that differ in two main pieces; top up with one-piece differences if needed.
  const count = opts.count ?? 3
  const picked: Outfit[] = []
  for (const minDiff of [2, 1]) {
    for (const o of outfits) {
      if (picked.length >= count) break
      if (!picked.includes(o) && picked.every((p) => differences(p, o) >= minDiff)) picked.push(o)
    }
  }

  picked.sort((a, b) => b.score - a.score)
  const reasons = buildReasons(run, plan)
  return picked.map((o, i) => ({ ...o, id: `outfit-${i + 1}`, reasons }))
}
