import { mirror, type Pt } from './body'

const f = (n: number) => Math.round(n * 10) / 10

/** Smooth Catmull-Rom curve through points, as cubic Bézier segments (without the initial M). */
export function curveThrough(points: Pt[], tension = 0.5): string {
  if (points.length < 2) return ''
  let d = ''
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const t = tension / 3
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t]
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`
  }
  return d
}

export const M = ([x, y]: Pt) => `M${f(x)},${f(y)}`
export const L = ([x, y]: Pt) => ` L${f(x)},${f(y)}`
export const Q = ([cx, cy]: Pt, [x, y]: Pt) => ` Q${f(cx)},${f(cy)} ${f(x)},${f(y)}`

/**
 * A left-right symmetric closed shape. `left` runs top → bottom down the viewer's left side;
 * `top` joins the two top points (e.g. a neckline) and `bottom` the two bottom points (a hem).
 */
export function symmetric(left: Pt[], opts: { top?: (l: Pt, r: Pt) => string; bottom?: (l: Pt, r: Pt) => string } = {}): string {
  const right = left.map(mirror).reverse()
  const lTop = left[0]
  const lBot = left[left.length - 1]
  const rBot = right[0]
  const rTop = right[right.length - 1]
  return (
    M(lTop) +
    curveThrough(left) +
    (opts.bottom ? opts.bottom(lBot, rBot) : L(rBot)) +
    curveThrough(right) +
    (opts.top ? opts.top(rTop, lTop) : L(lTop)) +
    ' Z'
  )
}

/** A closed shape from an outline that goes down one edge and back up the other. */
export function band(down: Pt[], up: Pt[]): string {
  return M(down[0]) + curveThrough(down) + L(up[0]) + curveThrough(up) + ' Z'
}

export const mirrorPts = (pts: Pt[]) => pts.map(mirror)
