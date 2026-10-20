/** Garment geometry. Pure functions from the body skeleton to SVG path strings. */
import { legLines, mirror, xAt, type Body, type Pt } from './body'
import { L, M, Q, band, curveThrough, mirrorPts, symmetric } from './path'

export type Neck = 'crew' | 'v' | 'high' | 'wide' | 'collar'

interface TorsoOpts {
  hemY: number
  loose?: number
  flare?: number
  neck?: Neck
  /** Extra outward offset for layers worn over others. */
  over?: number
}

/** Half-width of the garment side at a height, before looseness. */
function sideAt(b: Body, y: number): number {
  if (y <= b.chestY) return b.chest
  if (y <= b.waistY) return b.chest + ((y - b.chestY) / (b.waistY - b.chestY)) * (b.waist - b.chest)
  if (y <= b.hipY) return b.waist + ((y - b.waistY) / (b.hipY - b.waistY)) * (b.hip - b.waist)
  return b.hip
}

function neckTop(b: Body, neck: Neck, over: number): { pt: Pt; join: (r: Pt, l: Pt) => string } {
  const cx = b.cx
  switch (neck) {
    case 'v':
      return { pt: [cx - 9 - over, 91], join: (_r, l) => L([cx, 120 + over * 2]) + L(l) }
    case 'high':
      return { pt: [cx - 9, 70], join: (_r, l) => Q([cx, 68], l) }
    case 'wide':
      return { pt: [cx - 13 - over, 94], join: (_r, l) => Q([cx, 106], l) }
    default:
      return { pt: [cx - 9.5 - over, 91], join: (_r, l) => Q([cx, 100 + over], l) }
  }
}

/** Upper body garment from neckline to hem (also used for long robes and coats). */
export function torso(b: Body, o: TorsoOpts): string {
  const { hemY, loose = 0, flare = 0, neck = 'crew', over = 0 } = o
  const cx = b.cx
  const top = neckTop(b, neck, over)
  const left: Pt[] = [top.pt, [cx - b.shoulder - 1 - over, b.shoulderY + 2], [cx - b.chest - 1.5 - over - loose * 0.4, b.chestY]]
  for (const y of [b.waistY, b.hipY]) {
    if (y < hemY) left.push([cx - sideAt(b, y) - 1.5 - over - loose, y])
  }
  const hemSide = sideAt(b, hemY) + 1.5 + over + loose + (hemY > b.hipY ? flare : 0)
  left.push([cx - hemSide, hemY])
  return symmetric(left, {
    bottom: (_l, r) => Q([cx, hemY + 3], r),
    top: (r, l) => top.join(r, l),
  })
}

/** Left and right sleeves down to endY. */
export function sleeves(b: Body, o: { endY: number; loose?: number; over?: number }): [string, string] {
  const { endY, loose = 0, over = 0 } = o
  const ex = 1.6 + over
  const steps = [b.shoulderY + 2, 150, 190, 230, endY].filter((y, i, a) => y <= endY && a.indexOf(y) === i)
  if (steps[steps.length - 1] !== endY) steps.push(endY)
  const span = Math.max(1, endY - b.shoulderY)
  const outer: Pt[] = steps.map((y) => [xAt(b.armOuter, y) - ex - (loose * (y - b.shoulderY)) / span, y])
  outer[0] = [b.cx - b.shoulder - 1 - over, b.shoulderY + 1]
  const innerYs = [endY, ...[190, 150].filter((y) => y < endY), b.chestY - 4]
  const inner: Pt[] = innerYs.map((y, i) =>
    i === innerYs.length - 1 ? [b.cx - b.chest - 1.5 - over, y] : [xAt(b.armInner, y) + ex * 0.6 + (loose * (y - b.shoulderY)) / span * 0.6, y],
  )
  const left = band(outer, inner)
  const right = band(mirrorPts(outer), mirrorPts(inner))
  return [left, right]
}

export type LegFit = 'leggings' | 'slim' | 'jeans' | 'straight' | 'joggers' | 'cargo' | 'wide' | 'jeans-wide'

const HEM_HALF: Record<LegFit, number> = {
  leggings: 6.9,
  slim: 8.2,
  jeans: 9.2,
  straight: 10.2,
  joggers: 7.4,
  cargo: 10.6,
  'jeans-wide': 12.5,
  wide: 15.5,
}

/** Trousers or shorts covering both legs from the waist to hemY. */
export function trousers(b: Body, o: { fit: LegFit; hemY: number }): string {
  const { fit, hemY } = o
  const legs = legLines(b)
  const c = b.cx - b.legOffset
  // Long trousers use the fit's hem width; shorts follow the thigh plus a little ease.
  const half = hemY >= b.kneeY ? HEM_HALF[fit] : c - xAt(legs.outer, hemY) + 2.5
  const kneeHalf = Math.max(b.knee + 1.8, fit === 'wide' ? half - 2 : fit === 'leggings' ? b.knee + 0.6 : (half + b.knee) / 2 + 0.8)

  const outer: Pt[] = [[b.cx - b.waist - 1.8, b.waistY - 2], [b.cx - b.hip - 2, b.hipY]]
  const inner: Pt[] = []
  if (hemY >= b.kneeY) {
    outer.push([c - b.thigh - 1.8, b.crotchY + 10], [c - kneeHalf, b.kneeY], [c - half, hemY])
    inner.push([c + half, hemY], [c + kneeHalf, b.kneeY], [c + b.thigh + 0.5, b.crotchY + 14])
  } else {
    outer.push([c - half, hemY])
    inner.push([c + half - 1, hemY], [c + b.thigh, b.crotchY + 10])
  }
  inner.push([b.cx, b.crotchY - 3])
  const rightInner = mirrorPts([...inner].reverse())
  const rightOuter = mirrorPts([...outer].reverse())
  return M(outer[0]) + curveThrough(outer) + L(inner[0]) + curveThrough(inner) + curveThrough(rightInner) + L(rightOuter[0]) + curveThrough(rightOuter) + ' Z'
}

/** A skirt from the waist with an A-line flare. */
export function skirt(b: Body, o: { hemY: number; flare: number }): string {
  const left: Pt[] = [[b.cx - b.waist - 1.8, b.waistY - 2], [b.cx - b.hip - 2.5, b.hipY], [b.cx - b.hip - 2.5 - o.flare, o.hemY]]
  return symmetric(left, { bottom: (_l, r) => Q([b.cx, o.hemY + 4], r), top: (_r, l) => Q([b.cx, b.waistY - 4], l) })
}

/** Two front panels of an open garment (blazer, open abaya, bisht, cardigan), leaving the centre visible. */
export function openFront(
  b: Body,
  o: { hemY: number; loose?: number; flare?: number; over?: number; gapHem: number; gapChest: number; vBottomY: number },
): [string, string] {
  const { hemY, loose = 0, flare = 0, over = 3, gapHem, gapChest, vBottomY } = o
  const cx = b.cx
  const side: Pt[] = [[cx - 11 - over, 90], [cx - b.shoulder - 1 - over, b.shoulderY + 2], [cx - b.chest - 1.5 - over - loose * 0.4, b.chestY]]
  for (const y of [b.waistY, b.hipY]) if (y < hemY) side.push([cx - sideAt(b, y) - 1.5 - over - loose, y])
  side.push([cx - sideAt(b, hemY) - 1.5 - over - loose - (hemY > b.hipY ? flare : 0), hemY])
  const centre: Pt[] = [[cx - gapHem, hemY], [cx - gapChest, Math.min(vBottomY, hemY - 1)], [cx - 6, 96]]
  const left = M(side[0]) + curveThrough(side) + L(centre[0]) + L(centre[1]) + L(centre[2]) + ' Z'
  const right = M(mirror(side[0])) + curveThrough(mirrorPts(side)) + L(mirror(centre[0])) + L(mirror(centre[1])) + L(mirror(centre[2])) + ' Z'
  return [left, right]
}

/** Shirt-style collar points. */
export function collar(b: Body, spread = 0): [string, string] {
  const cx = b.cx
  const left = M([cx - 10 - spread, 89]) + L([cx - 1.5, 106]) + L([cx - 14 - spread, 102]) + ' Z'
  const right = M([cx + 10 + spread, 89]) + L([cx + 1.5, 106]) + L([cx + 14 + spread, 102]) + ' Z'
  return [left, right]
}

/** Lapels for blazers and coats. */
export function lapels(b: Body, vBottomY: number): [string, string] {
  const cx = b.cx
  const left = M([cx - 7, 92]) + L([cx - 17, 108]) + L([cx - 11, 118]) + L([cx - 2, vBottomY]) + ' Z'
  const right = M([cx + 7, 92]) + L([cx + 17, 108]) + L([cx + 11, 118]) + L([cx + 2, vBottomY]) + ' Z'
  return [left, right]
}

/** Both legs (used for tights). */
export function legsShape(b: Body, fromY = b.hipY): string {
  const { outer, inner } = legLines(b)
  const o = outer.filter(([, y]) => y >= fromY)
  const left: Pt[] = [[b.cx - b.hip - 0.5, fromY], ...o.slice(1)]
  const innerUp = [...inner].reverse()
  const right = mirrorPts(inner)
  const rightOuterUp = mirrorPts([...left].reverse())
  return M(left[0]) + curveThrough(left) + L(innerUp[0]) + curveThrough(innerUp) + curveThrough(right) + L(rightOuterUp[0]) + curveThrough(rightOuterUp) + ' Z'
}

/** Front-view foot/shoe outline for the left (sx = -1) or right (sx = 1) foot. */
export function shoe(b: Body, sx: -1 | 1, o: { top?: number; width?: number; toe?: number } = {}): string {
  const x = sx < 0 ? b.cx - b.legOffset : b.cx + b.legOffset
  const top = o.top ?? b.ankleY + 1
  const w = o.width ?? 10.5
  const s = b.soleY
  const toe = (o.toe ?? 2) * sx
  return (
    M([x - w + 1.5, top]) +
    Q([x - w - 1 + toe, s - 9], [x - w - 1.5 + toe, s - 3]) +
    Q([x - w - 1 + toe, s], [x - w + 4 + toe, s]) +
    L([x + w - 4 + toe, s]) +
    Q([x + w + 1 + toe, s], [x + w + 1.5 + toe, s - 3]) +
    Q([x + w + 1 + toe, s - 9], [x + w - 1.5, top]) +
    ' Z'
  )
}

/** Boot shaft from shaftTop down to the ankle. */
export function bootShaft(b: Body, sx: -1 | 1, shaftTop: number, extra = 3): string {
  const { outer, inner } = legLines(b)
  const ox = xAt(outer, shaftTop) - extra
  const ix = xAt(inner, shaftTop) + extra
  const left = M([ox, shaftTop]) + L([ix, shaftTop]) + L([xAt(inner, b.ankleY) + extra + 1, b.ankleY + 4]) + L([xAt(outer, b.ankleY) - extra - 1, b.ankleY + 4]) + ' Z'
  if (sx < 0) return left
  return M(mirror([ox, shaftTop])) + L(mirror([ix, shaftTop])) + L(mirror([xAt(inner, b.ankleY) + extra + 1, b.ankleY + 4])) + L(mirror([xAt(outer, b.ankleY) - extra - 1, b.ankleY + 4])) + ' Z'
}

/** Sock band on each leg between top and the shoe. */
export function sockBand(b: Body, top: number): [string, string] {
  const { outer, inner } = legLines(b)
  const y2 = b.ankleY + 8
  const pts = (side: (p: Pt) => Pt) =>
    M(side([xAt(outer, top) - 0.8, top])) + L(side([xAt(inner, top) + 0.8, top])) + L(side([xAt(inner, y2) + 1.5, y2])) + L(side([xAt(outer, y2) - 1.5, y2])) + ' Z'
  return [pts((p) => p), pts(mirror)]
}

// ---------- head ----------

export function headCover(b: Body, o: { drapeY: number; width: number; tight?: number }): string {
  const { cx } = b
  const { cy, rx, ry } = b.head
  const t = o.tight ?? 0
  const left: Pt[] = [
    [cx - 13 + t, cy - ry - 3.5 + t],
    [cx - rx - 5 + t, cy - 13],
    [cx - rx - 7 + t, cy + 14],
    [cx - rx - 9 + t, cy + 34],
    [cx - o.width, o.drapeY - 18],
    [cx - o.width + 4, o.drapeY],
  ]
  return symmetric(left, { bottom: (_l, r) => Q([cx, o.drapeY + 12], r), top: (_r, l) => Q([cx, cy - ry - 9 + t], l) })
}

export function faceOpening(b: Body, scale = 1): { cx: number; cy: number; rx: number; ry: number } {
  return { cx: b.cx, cy: b.head.cy + 2, rx: 15.5 * scale, ry: 19.5 * scale }
}

export function shortHair(b: Body): string {
  const { cx } = b
  const { cy, rx, ry } = b.head
  return (
    M([cx - rx - 0.8, cy - 1]) +
    Q([cx - rx - 2, cy - ry - 4], [cx, cy - ry - 3.5]) +
    Q([cx + rx + 2, cy - ry - 4], [cx + rx + 0.8, cy - 1]) +
    Q([cx + rx - 2, cy - 14], [cx + 6, cy - 17]) +
    Q([cx - 4, cy - 12], [cx - rx + 3, cy - 12]) +
    ' Z'
  )
}

export function longHairBack(b: Body): string {
  const { cx } = b
  const { cy, rx, ry } = b.head
  const left: Pt[] = [[cx - 12, cy - ry - 1.5], [cx - rx - 4, cy - 6], [cx - rx - 6, cy + 30], [cx - rx - 7, 118], [cx - rx - 2, 134]]
  return symmetric(left, { bottom: (_l, r) => Q([cx, 128], r), top: (_r, l) => Q([cx, cy - ry - 6], l) })
}

export function longHairFront(b: Body): string {
  const { cx } = b
  const { cy, rx, ry } = b.head
  return (
    M([cx - rx - 1, cy + 6]) +
    Q([cx - rx - 3, cy - ry - 4], [cx + 2, cy - ry - 3]) +
    Q([cx + rx + 3, cy - ry - 3], [cx + rx + 1, cy + 6]) +
    Q([cx + rx - 3, cy - 10], [cx + 4, cy - 15]) +
    Q([cx - 8, cy - 8], [cx - rx + 2, cy + 6]) +
    ' Z'
  )
}

export function capDome(b: Body, lowY: number): string {
  const { cx } = b
  const { cy, rx, ry } = b.head
  return M([cx - rx - 1.5, lowY]) + Q([cx - rx - 1, cy - ry - 9], [cx, cy - ry - 7]) + Q([cx + rx + 1, cy - ry - 9], [cx + rx + 1.5, lowY]) + ' Z'
}
