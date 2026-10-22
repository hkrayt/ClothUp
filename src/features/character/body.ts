import type { Gender } from '@/engine/types'

export type Pt = [number, number]

/**
 * The character skeleton. Every garment is drawn from these measurements, so any item fits any body.
 * viewBox is 0 0 200 460, centre line x = 100. Points describe the viewer's left side; the right side is mirrored.
 */
export interface Body {
  gender: Gender
  cx: number
  head: { cy: number; rx: number; ry: number }
  neck: { top: number; bottom: number; half: number }
  shoulderY: number
  shoulder: number
  chestY: number
  chest: number
  waistY: number
  waist: number
  hipY: number
  hip: number
  crotchY: number
  legOffset: number
  thigh: number
  kneeY: number
  knee: number
  ankleY: number
  ankle: number
  soleY: number
  armOuter: Pt[]
  armInner: Pt[]
  hand: { x: number; y: number; rx: number; ry: number }
}

export const VIEWBOX = { w: 200, h: 460 }

const common = {
  cx: 100,
  head: { cy: 46, rx: 20.5, ry: 25 },
  neck: { top: 62, bottom: 96, half: 7.5 },
  shoulderY: 98,
  chestY: 128,
  waistY: 186,
  hipY: 230,
  crotchY: 250,
  kneeY: 336,
  ankleY: 418,
  soleY: 440,
}

export const BODIES: Record<Gender, Body> = {
  male: {
    ...common,
    gender: 'male',
    shoulder: 38,
    chest: 33,
    waist: 29,
    hip: 30,
    legOffset: 15,
    thigh: 14.5,
    knee: 10,
    ankle: 6.5,
    armOuter: [[62, 100], [55, 150], [51, 190], [48, 262]],
    armInner: [[72, 122], [68, 150], [63, 190], [58, 262]],
    hand: { x: 53, y: 274, rx: 7, ry: 10 },
  },
  female: {
    ...common,
    gender: 'female',
    shoulder: 33,
    chest: 30,
    waist: 24.5,
    hip: 33.5,
    legOffset: 15.5,
    thigh: 15.5,
    knee: 9.5,
    ankle: 6,
    armOuter: [[67, 100], [60, 150], [57, 190], [54, 262]],
    armInner: [[76, 122], [72, 150], [67, 190], [62, 262]],
    hand: { x: 58, y: 273, rx: 6.5, ry: 9.5 },
  },
}

export const mirror = ([x, y]: Pt): Pt => [200 - x, y]

/** Linear interpolation of x along a polyline at height y. */
export function xAt(line: Pt[], y: number): number {
  if (y <= line[0][1]) return line[0][0]
  for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1]
    const [x1, y1] = line[i]
    if (y <= y1) return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0)
  }
  return line[line.length - 1][0]
}

/** Left leg outline (outer edge then inner edge), top to bottom. */
export function legLines(b: Body): { outer: Pt[]; inner: Pt[] } {
  const c = b.cx - b.legOffset
  return {
    outer: [[b.cx - b.hip, b.hipY], [c - b.thigh, b.crotchY + 10], [c - b.knee - 0.5, b.kneeY], [c - b.ankle, b.ankleY]],
    inner: [[b.cx - 1.5, b.crotchY], [c + b.thigh - 1, b.crotchY + 14], [c + b.knee, b.kneeY], [c + b.ankle, b.ankleY]],
  }
}

export { HAIR, SKIN_TONES } from '@/engine/styling'
