import type { ReactNode } from 'react'
import type { ClothingItem } from '@/engine/outfit-types'
import { legLines, mirror, xAt, type Body, type Pt } from './body'
import { L, M, Q, curveThrough, mirrorPts } from './path'
import { PARTS_V12 } from './parts2'
import {
  bootShaft,
  capDome,
  collar,
  faceOpening,
  headCover,
  lapels,
  legsShape,
  longHairBack,
  longHairFront,
  openFront,
  shortHair,
  shoe,
  skirt,
  sleeves,
  sockBand,
  torso,
  trousers,
  type LegFit,
} from './shapes'

export interface PartCtx {
  b: Body
  /** Main fill: a hex color or a pattern url(). */
  fill: string
  /** Outline / fold color. */
  stroke: string
  /** Darker detail color (ribbing, lapels, soles). */
  dark: string
  variant?: string
  skin: string
  item: ClothingItem
  patternId: string
  /** Embroidery / trim color when the piece is embroidered. */
  trim?: string
}

export type Renderer = (c: PartCtx) => ReactNode

const SW = 1.1
const GOLD = '#C8A44C'

/** The shared side-to-side shading gradient defined in the character's <defs>. */
export const shadeUrl = (c: PartCtx) => `url(#${c.patternId}-shade)`

/** A garment shape: its fill, then a soft side-to-side shading overlay for depth. */
function P({ d, c, fill, sw = SW, opacity }: { d: string; c: PartCtx; fill?: string; sw?: number; opacity?: number }) {
  return (
    <>
      <path d={d} fill={fill ?? c.fill} stroke={c.stroke} strokeWidth={sw} strokeLinejoin="round" opacity={opacity} />
      <path d={d} fill={shadeUrl(c)} stroke="none" opacity={opacity} pointerEvents="none" />
    </>
  )
}

function Line({ d, c, w = 1, color, dash }: { d: string; c: PartCtx; w?: number; color?: string; dash?: string }) {
  return <path d={d} fill="none" stroke={color ?? c.stroke} strokeWidth={w} strokeLinecap="round" strokeDasharray={dash} />
}

const Sleeves = ({ c, endY, loose = 0, over = 0 }: { c: PartCtx; endY: number; loose?: number; over?: number }) => {
  const [l, r] = sleeves(c.b, { endY, loose, over })
  return (
    <>
      <P d={l} c={c} />
      <P d={r} c={c} />
    </>
  )
}

const Pair = ({ d, c, fill }: { d: [string, string]; c: PartCtx; fill?: string }) => (
  <>
    <P d={d[0]} c={c} fill={fill} />
    <P d={d[1]} c={c} fill={fill} />
  </>
)

const buttons = (c: PartCtx, from: number, to: number, x = c.b.cx, n = 4) =>
  Array.from({ length: n }, (_, i) => <circle key={i} cx={x} cy={from + ((to - from) * i) / Math.max(1, n - 1)} r={1.3} fill={c.dark} />)

const sleeveEnd = (v: string | undefined, b: Body) => (v === 'short' ? 146 : v === 'three' ? 220 : b.armOuter[3][1])

// ---------- tops ----------

const tee: Renderer = (c) => (
  <>
    <Sleeves c={c} endY={sleeveEnd(c.variant, c.b)} loose={1} />
    <P d={torso(c.b, { hemY: 238, loose: 1.5 })} c={c} />
    <Line c={c} d={M([c.b.cx - 9.5, 91]) + Q([c.b.cx, 101], [c.b.cx + 9.5, 91])} color={c.dark} w={1.6} />
  </>
)

const shirt: Renderer = (c) => {
  const { b } = c
  const end = c.variant === 'short' ? 148 : b.armOuter[3][1]
  return (
    <>
      <Sleeves c={c} endY={end} loose={c.variant === 'short' ? 3 : 1} />
      <P d={torso(b, { hemY: 240, loose: 2 })} c={c} />
      <Line c={c} d={M([b.cx, 104]) + L([b.cx, 238])} />
      {buttons(c, 116, 226, b.cx + 2, 5)}
      <Pair c={c} d={collar(b)} />
      {c.variant !== 'short' &&
        [-1, 1].map((s) => {
          const y = b.armOuter[3][1]
          const o = xAt(b.armOuter, y) - 1.6
          const i = xAt(b.armInner, y) + 1
          const pts: Pt[] = [[o, y - 8], [i, y - 8]]
          const [a, z] = s < 0 ? pts : pts.map(mirror)
          return <Line key={s} c={c} d={M(a) + L(z)} />
        })}
    </>
  )
}

const polo: Renderer = (c) => (
  <>
    <Sleeves c={c} endY={c.variant === 'long' ? c.b.armOuter[3][1] : 146} loose={1} />
    <P d={torso(c.b, { hemY: 238, loose: 1.5 })} c={c} />
    <Pair c={c} d={collar(c.b, 1)} />
    <Line c={c} d={M([c.b.cx, 104]) + L([c.b.cx, 130])} />
    {buttons(c, 112, 126, c.b.cx + 2, 2)}
  </>
)

const sport: Renderer = (c) => {
  const long = c.variant?.startsWith('long')
  const hem = c.variant === 'long-tunic' ? 300 : 236
  return (
    <>
      <Sleeves c={c} endY={long ? c.b.armOuter[3][1] : 146} loose={c.variant === 'long-tunic' ? 2 : 0.5} />
      <P d={torso(c.b, { hemY: hem, loose: c.variant === 'long-tunic' ? 4 : 1, flare: 3 })} c={c} />
      <Line c={c} d={M([c.b.cx - c.b.chest + 4, 112]) + L([c.b.cx - c.b.waist, 220])} color={c.dark} w={2.2} />
      <Line c={c} d={M([c.b.cx + c.b.chest - 4, 112]) + L([c.b.cx + c.b.waist, 220])} color={c.dark} w={2.2} />
    </>
  )
}

const turtleneck: Renderer = (c) => (
  <>
    <Sleeves c={c} endY={c.b.armOuter[3][1]} loose={0.5} />
    <P d={torso(c.b, { hemY: 236, loose: 1, neck: 'high' })} c={c} />
    {[74, 80, 86].map((y) => (
      <Line key={y} c={c} d={M([c.b.cx - 8, y]) + L([c.b.cx + 8, y])} color={c.dark} w={0.8} />
    ))}
  </>
)

const blouse: Renderer = (c) => {
  const loose = c.variant === 'loose'
  return (
    <>
      <Sleeves c={c} endY={c.b.armOuter[3][1]} loose={loose ? 5 : 3} />
      <P d={torso(c.b, { hemY: loose ? 268 : 242, loose: loose ? 5 : 3, flare: 4 })} c={c} />
      <Line c={c} d={M([c.b.cx - 9.5, 91]) + Q([c.b.cx, 104], [c.b.cx + 9.5, 91])} color={c.dark} w={1.4} />
    </>
  )
}

const tank: Renderer = (c) => (
  <>
    <P d={torso(c.b, { hemY: 236, loose: 1, neck: 'wide' })} c={c} />
  </>
)

const tunic: Renderer = (c) => (
  <>
    <Sleeves c={c} endY={c.b.armOuter[3][1]} loose={3} />
    <P d={torso(c.b, { hemY: 302, loose: 4.5, flare: 5 })} c={c} />
    <Line c={c} d={M([c.b.cx - 9.5, 91]) + Q([c.b.cx, 104], [c.b.cx + 9.5, 91])} color={c.dark} w={1.4} />
    <Line c={c} d={M([c.b.cx - c.b.hip - 8, 300]) + L([c.b.cx - c.b.hip - 7, 278])} />
    <Line c={c} d={M([c.b.cx + c.b.hip + 8, 300]) + L([c.b.cx + c.b.hip + 7, 278])} />
  </>
)

const thobe: Renderer = (c) => {
  const { b } = c
  return (
    <>
      <Sleeves c={c} endY={b.armOuter[3][1]} loose={2.5} />
      <P d={torso(b, { hemY: 414, loose: 5, flare: 7 })} c={c} />
      <path d={M([b.cx - 9, 84]) + L([b.cx + 9, 84]) + L([b.cx + 10, 92]) + L([b.cx - 10, 92]) + ' Z'} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      <Line c={c} d={M([b.cx, 92]) + L([b.cx, 162])} />
      {buttons(c, 102, 154, b.cx + 2.5, 4)}
      <Line c={c} d={M([b.cx - 26, 200]) + L([b.cx - 24, 214])} />
      {c.trim && (
        <>
          <Line c={c} d={M([b.cx - 9, 86]) + L([b.cx + 9, 86])} color={c.trim} w={2.4} />
          <Line c={c} d={M([b.cx - 3, 94]) + L([b.cx - 3, 160]) + M([b.cx + 3, 94]) + L([b.cx + 3, 160])} color={c.trim} w={1.6} dash="3 2" />
        </>
      )}
    </>
  )
}

const DRESS: Record<string, { hem: number; flare: number; sleeve: 'short' | 'long' | 'cap'; loose: number }> = {
  midi: { hem: 332, flare: 12, sleeve: 'short', loose: 0 },
  maxi: { hem: 412, flare: 15, sleeve: 'short', loose: 1 },
  gown: { hem: 424, flare: 20, sleeve: 'cap', loose: 0 },
  'midi-long': { hem: 330, flare: 5, sleeve: 'long', loose: 1 },
  'maxi-long': { hem: 414, flare: 15, sleeve: 'long', loose: 3 },
  tee: { hem: 326, flare: 5, sleeve: 'short', loose: 2.5 },
}

const dress: Renderer = (c) => {
  const d = DRESS[c.variant ?? 'midi'] ?? DRESS.midi
  const end = d.sleeve === 'long' ? c.b.armOuter[3][1] : d.sleeve === 'cap' ? 116 : 146
  return (
    <>
      <Sleeves c={c} endY={end} loose={d.sleeve === 'long' ? d.loose + 1 : 1} />
      <P d={torso(c.b, { hemY: d.hem, loose: d.loose, flare: d.flare, neck: d.sleeve === 'cap' ? 'v' : 'crew' })} c={c} />
      {d.loose < 2 && <Line c={c} d={M([c.b.cx - c.b.waist - 1, c.b.waistY]) + Q([c.b.cx, c.b.waistY + 4], [c.b.cx + c.b.waist + 1, c.b.waistY])} color={c.dark} w={1.4} />}
    </>
  )
}

const abaya: Renderer = (c) => {
  const { b } = c
  if (c.variant === 'open') return openAbaya(c)
  const evening = c.variant === 'evening'
  const butterfly = c.variant === 'butterfly'
  return (
    <>
      <Sleeves c={c} endY={butterfly ? 246 : b.armOuter[3][1] + 4} loose={butterfly ? 20 : 7} />
      <P d={torso(b, { hemY: 420, loose: butterfly ? 9 : 7, flare: butterfly ? 22 : 18 })} c={c} />
      {evening && (
        <>
          <Line c={c} d={M([b.cx, 100]) + L([b.cx, 420])} color={GOLD} w={2} />
          <Line c={c} d={M([b.cx - 9.5, 91]) + Q([b.cx, 101], [b.cx + 9.5, 91])} color={GOLD} w={2} />
        </>
      )}
    </>
  )
}

// ---------- mid layers ----------

const ribHem = (c: PartCtx, y: number, half: number) => (
  <path d={M([c.b.cx - half, y - 6]) + L([c.b.cx + half, y - 6]) + L([c.b.cx + half, y + 1]) + L([c.b.cx - half, y + 1]) + ' Z'} fill={c.dark} opacity={0.35} />
)

const sweater: Renderer = (c) => (
  <>
    <Sleeves c={c} endY={c.b.armOuter[3][1]} loose={2} over={1.5} />
    <P d={torso(c.b, { hemY: 240, loose: 3, over: 1.5, neck: c.variant === 'vneck' ? 'v' : 'crew' })} c={c} />
    {ribHem(c, 240, c.b.hip + 5)}
    {c.variant === 'cable' &&
      [-14, 0, 14].map((dx) => (
        <Line key={dx} c={c} d={Array.from({ length: 9 }, (_, i) => (i ? L : M)([c.b.cx + dx + (i % 2 ? 2.5 : -2.5), 106 + i * 15])).join('')} color={c.dark} w={1.2} />
      ))}
  </>
)

const hoodie: Renderer = (c) => (
  <>
    <path d={M([c.b.cx - 24, 98]) + Q([c.b.cx - 22, 70], [c.b.cx, 74]) + Q([c.b.cx + 22, 70], [c.b.cx + 24, 98]) + ' Z'} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
    <Sleeves c={c} endY={c.b.armOuter[3][1]} loose={2.5} over={2} />
    <P d={torso(c.b, { hemY: 242, loose: 4, over: 2 })} c={c} />
    <path d={M([c.b.cx - 18, 196]) + L([c.b.cx + 18, 196]) + L([c.b.cx + 22, 226]) + L([c.b.cx - 22, 226]) + ' Z'} fill="none" stroke={c.stroke} strokeWidth={SW} />
    <Line c={c} d={M([c.b.cx - 4, 98]) + L([c.b.cx - 5, 124])} w={1.3} />
    <Line c={c} d={M([c.b.cx + 4, 98]) + L([c.b.cx + 5, 124])} w={1.3} />
    {ribHem(c, 242, c.b.hip + 6)}
  </>
)

const fleece: Renderer = (c) => (
  <>
    <Sleeves c={c} endY={c.b.armOuter[3][1]} loose={2.5} over={2} />
    <P d={torso(c.b, { hemY: 244, loose: 4, over: 2, neck: 'high' })} c={c} />
    <Line c={c} d={M([c.b.cx, 72]) + L([c.b.cx, 244])} color={c.dark} w={1.4} />
  </>
)

const cardigan: Renderer = (c) => {
  const long = c.variant === 'long'
  const hem = long ? 344 : 246
  return (
    <>
      <Sleeves c={c} endY={c.b.armOuter[3][1]} loose={long ? 4 : 2} over={2} />
      <Pair c={c} d={openFront(c.b, { hemY: hem, loose: long ? 5 : 3, flare: long ? 4 : 0, over: 2, gapHem: long ? 12 : 4, gapChest: long ? 8 : 3, vBottomY: long ? 330 : 150 })} />
      {!long && buttons(c, 156, 236, c.b.cx - 5, 4)}
    </>
  )
}

// ---------- outer layers ----------

const jacket: Renderer = (c) => {
  const { b } = c
  const v = c.variant
  if (v === 'leather' || v === 'denim') {
    const hem = 238
    return (
      <>
        <Sleeves c={c} endY={b.armOuter[3][1]} loose={2.5} over={3} />
        <Pair c={c} d={openFront(b, { hemY: hem, loose: 3, over: 3.5, gapHem: 9, gapChest: 7, vBottomY: 150 })} />
        <Pair c={c} d={lapels(b, 132)} fill={c.dark} />
        {v === 'denim' && (
          <>
            <Line c={c} d={M([b.cx - 26, 140]) + L([b.cx - 12, 140])} color={c.dark} w={1.2} />
            <Line c={c} d={M([b.cx + 26, 140]) + L([b.cx + 12, 140])} color={c.dark} w={1.2} />
          </>
        )}
      </>
    )
  }
  if (v === 'overshirt') {
    return (
      <>
        <Sleeves c={c} endY={b.armOuter[3][1]} loose={3} over={3} />
        <Pair c={c} d={openFront(b, { hemY: 252, loose: 4, over: 3.5, gapHem: 7, gapChest: 5, vBottomY: 120 })} />
        <Pair c={c} d={collar(b, 3)} />
        {buttons(c, 128, 236, b.cx - 6, 5)}
        <rect x={b.cx - 26} y={128} width={13} height={14} rx={1.5} fill="none" stroke={c.stroke} strokeWidth={SW} />
        <rect x={b.cx + 13} y={128} width={13} height={14} rx={1.5} fill="none" stroke={c.stroke} strokeWidth={SW} />
      </>
    )
  }
  const hem = v === 'bomber' ? 236 : v === 'track' ? 244 : 254
  return (
    <>
      {(v === 'rain' || v === 'windbreaker') && (
        <path d={M([b.cx - 26, 100]) + Q([b.cx - 24, 72], [b.cx, 76]) + Q([b.cx + 24, 72], [b.cx + 26, 100]) + ' Z'} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      )}
      <Sleeves c={c} endY={b.armOuter[3][1]} loose={3} over={3} />
      <P d={torso(b, { hemY: hem, loose: 4, over: 3.5, neck: v === 'bomber' ? 'crew' : 'high' })} c={c} />
      <Line c={c} d={M([b.cx, v === 'bomber' ? 100 : 72]) + L([b.cx, hem])} color={c.dark} w={1.4} />
      {v === 'bomber' && ribHem(c, hem, b.hip + 7)}
      {v === 'windbreaker' && <Line c={c} d={M([b.cx - b.chest - 4, 140]) + L([b.cx + b.chest + 4, 140])} color={c.dark} w={3} />}
      {v === 'track' &&
        [false, true].map((mir) => {
          const pts = b.armOuter.map(([x, y]): Pt => [x + 4, y])
          return <Line key={String(mir)} c={c} d={curveThrough(mir ? mirrorPts(pts) : pts)} color="#F4F4F2" w={2.2} />
        })}
    </>
  )
}

const blazer: Renderer = (c) => {
  const { b } = c
  const suit = c.variant === 'suit'
  const long = c.variant === 'long'
  return (
    <>
      <Sleeves c={c} endY={b.armOuter[3][1] - 2} loose={2} over={3} />
      <Pair c={c} d={openFront(b, { hemY: long ? 304 : 254, loose: long ? 5 : 3, flare: long ? 3 : 0, over: 3.5, gapHem: long ? 8 : 3, gapChest: 2, vBottomY: 172 })} />
      <Pair c={c} d={lapels(b, 168)} fill={suit ? c.dark : c.fill} />
      <circle cx={b.cx - 2.5} cy={182} r={1.6} fill={c.dark} />
      <Line c={c} d={M([b.cx - 30, 214]) + L([b.cx - 14, 214])} />
      <Line c={c} d={M([b.cx + 30, 214]) + L([b.cx + 14, 214])} />
    </>
  )
}

const COAT_HEM: Record<string, number> = { pea: 276, long: 334, trench: 342, 'trench-long': 382, 'extra-long': 396 }

const coat: Renderer = (c) => {
  const { b } = c
  const hem = COAT_HEM[c.variant ?? 'long'] ?? 334
  const trench = c.variant?.startsWith('trench')
  return (
    <>
      <Sleeves c={c} endY={b.armOuter[3][1]} loose={3} over={4} />
      <Pair c={c} d={openFront(b, { hemY: hem, loose: 5, flare: 6, over: 4.5, gapHem: 3, gapChest: 2, vBottomY: 170 })} />
      <Pair c={c} d={lapels(b, 160)} fill={c.fill} />
      {trench ? (
        <>
          <path d={M([b.cx - b.waist - 11, b.waistY - 4]) + L([b.cx + b.waist + 11, b.waistY - 4]) + L([b.cx + b.waist + 11, b.waistY + 4]) + L([b.cx - b.waist - 11, b.waistY + 4]) + ' Z'} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
          <rect x={b.cx - 5} y={b.waistY - 5} width={10} height={10} rx={1.5} fill="none" stroke={c.stroke} strokeWidth={1.4} />
          {buttons(c, 178, 222, b.cx - 9, 3)}
          {buttons(c, 178, 222, b.cx + 9, 3)}
        </>
      ) : c.variant === 'pea' ? (
        <>
          {buttons(c, 176, 236, b.cx - 9, 3)}
          {buttons(c, 176, 236, b.cx + 9, 3)}
        </>
      ) : (
        buttons(c, 180, 250, b.cx - 4, 3)
      )}
    </>
  )
}

const puffer: Renderer = (c) => {
  const { b } = c
  const hem = c.variant === 'long' ? 382 : 248
  const lines = []
  for (let y = 124; y < hem - 6; y += 24) lines.push(y)
  return (
    <>
      <Sleeves c={c} endY={b.armOuter[3][1]} loose={5} over={5} />
      <P d={torso(b, { hemY: hem, loose: 6, over: 5, flare: c.variant === 'long' ? 6 : 0, neck: 'high' })} c={c} />
      {lines.map((y) => (
        <Line key={y} c={c} d={M([b.cx - b.hip - 9, y]) + Q([b.cx, y + 4], [b.cx + b.hip + 9, y])} color={c.dark} w={1} />
      ))}
      <Line c={c} d={M([b.cx, 70]) + L([b.cx, hem])} color={c.dark} w={1.4} />
    </>
  )
}

const bisht: Renderer = (c) => {
  const { b } = c
  const [l, r] = openFront(b, { hemY: 404, loose: 12, flare: 14, over: 6, gapHem: 22, gapChest: 12, vBottomY: 320 })
  return (
    <>
      <Sleeves c={c} endY={252} loose={12} over={6} />
      <P d={l} c={c} opacity={0.97} />
      <P d={r} c={c} opacity={0.97} />
      <Line c={c} d={M([b.cx - 6, 96]) + L([b.cx - 12, 320]) + L([b.cx - 22, 404])} color={GOLD} w={2.4} />
      <Line c={c} d={M([b.cx + 6, 96]) + L([b.cx + 12, 320]) + L([b.cx + 22, 404])} color={GOLD} w={2.4} />
      <Line c={c} d={M([b.cx - 12, 92]) + Q([b.cx, 86], [b.cx + 12, 92])} color={GOLD} w={2.4} />
    </>
  )
}

const farwa: Renderer = (c) => {
  const { b } = c
  const [l, r] = openFront(b, { hemY: 384, loose: 10, flare: 10, over: 6, gapHem: 16, gapChest: 9, vBottomY: 280 })
  const trim = '#EFE6D2'
  return (
    <>
      <Sleeves c={c} endY={b.armOuter[3][1]} loose={8} over={6} />
      <P d={l} c={c} />
      <P d={r} c={c} />
      <Line c={c} d={M([b.cx - 7, 94]) + L([b.cx - 9, 280]) + L([b.cx - 16, 384])} color={trim} w={5} />
      <Line c={c} d={M([b.cx + 7, 94]) + L([b.cx + 9, 280]) + L([b.cx + 16, 384])} color={trim} w={5} />
      <Line c={c} d={M([b.cx - 18, 96]) + Q([b.cx, 84], [b.cx + 18, 96])} color={trim} w={6} />
    </>
  )
}

function openAbaya(c: PartCtx) {
  const { b } = c
  return (
    <>
      <Sleeves c={c} endY={b.armOuter[3][1] + 4} loose={8} over={3} />
      <Pair c={c} d={openFront(b, { hemY: 420, loose: 8, flare: 18, over: 3.5, gapHem: 20, gapChest: 9, vBottomY: 270 })} />
    </>
  )
}

/** A layer to take along, shown folded over the right forearm. */
export const carried: Renderer = (c) => {
  const { b } = c
  const y = 200
  const o = 200 - xAt(b.armOuter, y) + 5
  const i = 200 - xAt(b.armInner, y) - 3
  const d = M([i, y - 6]) + L([o, y - 8]) + Q([o + 4, y + 14], [o, y + 40]) + L([i + 2, y + 36]) + Q([i - 3, y + 14], [i, y - 6]) + ' Z'
  return (
    <>
      <path d={d} fill={c.fill} stroke={c.stroke} strokeWidth={SW} strokeLinejoin="round" />
      <Line c={c} d={M([i + 1, y + 8]) + L([o + 1, y + 6])} color={c.dark} w={1} />
    </>
  )
}

// ---------- bottoms ----------

const trousersPart: Renderer = (c) => {
  const { b } = c
  // Culottes are wide trousers that stop at mid-calf.
  const culotte = c.variant === 'culotte'
  const fit = (culotte ? 'wide' : (c.variant ?? 'straight')) as LegFit
  const hemY = culotte ? 366 : fit === 'leggings' ? b.ankleY - 6 : fit === 'joggers' ? b.ankleY - 2 : b.ankleY + 3
  const legs = legLines(b)
  return (
    <>
      <P d={trousers(b, { fit, hemY })} c={c} />
      <Line c={c} d={M([b.cx - b.waist - 1.5, b.waistY + 4]) + L([b.cx + b.waist + 1.5, b.waistY + 4])} color={c.dark} w={1} />
      {(fit === 'straight' || fit === 'slim') &&
        [-1, 1].map((s) => {
          const x = b.cx + s * b.legOffset
          return <Line key={s} c={c} d={M([x, b.hipY + 8]) + L([x, hemY - 4])} color={c.dark} w={0.6} />
        })}
      {fit.startsWith('jeans') && (
        <>
          <Line c={c} d={M([b.cx - b.hip + 4, b.waistY + 8]) + Q([b.cx - 14, b.waistY + 12], [b.cx - 12, b.waistY + 22])} color={c.dark} w={0.9} dash="2 2" />
          <Line c={c} d={M([b.cx + b.hip - 4, b.waistY + 8]) + Q([b.cx + 14, b.waistY + 12], [b.cx + 12, b.waistY + 22])} color={c.dark} w={0.9} dash="2 2" />
        </>
      )}
      {fit === 'joggers' &&
        [-1, 1].map((s) => {
          const x = b.cx + s * b.legOffset
          return <rect key={s} x={x - 8} y={hemY - 6} width={16} height={6} rx={2} fill={c.dark} opacity={0.4} />
        })}
      {fit === 'cargo' &&
        [-1, 1].map((s) => {
          const x = s < 0 ? xAt(legs.outer, 290) + 1 : 200 - xAt(legs.outer, 290) - 13
          return <rect key={s} x={x} y={282} width={12} height={16} rx={1.5} fill="none" stroke={c.stroke} strokeWidth={SW} />
        })}
    </>
  )
}

const shorts: Renderer = (c) => {
  const swim = c.variant === 'swim'
  const hemY = swim ? 316 : c.b.gender === 'male' ? 304 : 290
  return (
    <>
      <P d={trousers(c.b, { fit: 'straight', hemY })} c={c} />
      {(c.variant === 'sport' || swim) && (
        <>
          <Line c={c} d={M([c.b.cx - c.b.hip - 1, 236]) + L([c.b.cx - c.b.hip + 2, hemY])} color={c.dark} w={2} />
          <Line c={c} d={M([c.b.cx + c.b.hip + 1, 236]) + L([c.b.cx + c.b.hip - 2, hemY])} color={c.dark} w={2} />
        </>
      )}
    </>
  )
}

const skirtPart: Renderer = (c) => {
  const maxi = c.variant === 'maxi'
  const hem = maxi ? 414 : 336
  const flare = maxi ? 16 : 11
  return (
    <>
      <P d={skirt(c.b, { hemY: hem, flare })} c={c} />
      {maxi &&
        [-24, -12, 0, 12, 24].map((dx) => (
          <Line key={dx} c={c} d={M([c.b.cx + dx * 0.55, c.b.hipY]) + L([c.b.cx + dx, hem])} color={c.dark} w={0.6} />
        ))}
    </>
  )
}

// ---------- socks & shoes ----------

const socks: Renderer = (c) => <Pair c={c} d={sockBand(c.b, c.variant === 'ankle' ? c.b.ankleY - 3 : c.b.ankleY - 24)} />
const tights: Renderer = (c) => <P d={legsShape(c.b)} c={c} sw={0.6} />

const feet = (_c: PartCtx, render: (sx: -1 | 1) => ReactNode) => (
  <>
    {render(-1)}
    {render(1)}
  </>
)
const footX = (b: Body, sx: -1 | 1) => b.cx + sx * b.legOffset

const sole = (c: PartCtx, sx: -1 | 1, h: number, color: string) => {
  const x = footX(c.b, sx) + 2 * sx
  return <rect x={x - 12} y={c.b.soleY - h} width={24} height={h} rx={h / 2} fill={color} />
}

const sneaker: Renderer = (c) =>
  feet(c, (sx) => (
    <g key={sx}>
      <P d={shoe(c.b, sx)} c={c} />
      {sole(c, sx, 4, '#F4F4F2')}
      <Line c={c} d={M([footX(c.b, sx) - 4, c.b.ankleY + 6]) + L([footX(c.b, sx) + 4, c.b.ankleY + 6])} color={c.dark} w={0.9} />
    </g>
  ))

const runner: Renderer = (c) =>
  feet(c, (sx) => (
    <g key={sx}>
      <P d={shoe(c.b, sx, { width: 11 })} c={c} />
      {sole(c, sx, 5, '#FFFFFF')}
      <Line c={c} d={M([footX(c.b, sx) - 8 * sx, c.b.soleY - 8]) + Q([footX(c.b, sx), c.b.soleY - 14], [footX(c.b, sx) + 9 * sx, c.b.ankleY + 6])} color={c.dark} w={1.6} />
    </g>
  ))

const oxford: Renderer = (c) =>
  feet(c, (sx) => (
    <g key={sx}>
      <P d={shoe(c.b, sx, { width: 9.5, toe: 3 })} c={c} />
      {sole(c, sx, 2.5, c.dark)}
      <Line c={c} d={M([footX(c.b, sx) - 3, c.b.ankleY + 5]) + L([footX(c.b, sx) + 3, c.b.ankleY + 5])} color={c.dark} w={0.8} />
    </g>
  ))

const loafer: Renderer = (c) =>
  feet(c, (sx) => (
    <g key={sx}>
      <P d={shoe(c.b, sx, { width: 9.5, top: c.b.ankleY + 7, toe: 3 })} c={c} />
      {sole(c, sx, 2.5, c.dark)}
      <Line c={c} d={M([footX(c.b, sx) - 5, c.b.ankleY + 12]) + L([footX(c.b, sx) + 5, c.b.ankleY + 12])} color={c.dark} w={1.2} />
    </g>
  ))

const BOOT_TOP: Record<string, (b: Body) => number> = {
  hiking: (b) => b.ankleY - 26,
  chelsea: (b) => b.ankleY - 16,
  knee: (b) => b.kneeY - 6,
  rain: (b) => b.ankleY - 46,
}

const boot: Renderer = (c) => {
  const top = (BOOT_TOP[c.variant ?? ''] ?? ((b: Body) => b.ankleY - 20))(c.b)
  const rain = c.variant === 'rain'
  return feet(c, (sx) => (
    <g key={sx}>
      <P d={bootShaft(c.b, sx, top, c.variant === 'hiking' ? 4 : rain ? 5 : 2.5)} c={c} />
      <P d={shoe(c.b, sx, { width: c.variant === 'hiking' || rain ? 11.5 : 10 })} c={c} />
      {sole(c, sx, c.variant === 'hiking' || rain ? 5 : 3, c.dark)}
      {rain && <Line c={c} d={M([footX(c.b, sx) - 9, top + 4]) + L([footX(c.b, sx) + 9, top + 4])} color={c.dark} w={2} />}
      {c.variant === 'hiking' && <Line c={c} d={M([footX(c.b, sx) - 3, top + 6]) + L([footX(c.b, sx) + 3, top + 10]) + M([footX(c.b, sx) - 3, top + 14]) + L([footX(c.b, sx) + 3, top + 18])} color={c.dark} w={1} />}
      {c.variant === 'chelsea' && <rect x={footX(c.b, sx) - 9 * sx - 2} y={top + 3} width={4} height={12} rx={1} fill={c.dark} opacity={0.5} />}
    </g>
  ))
}

const heel: Renderer = (c) =>
  feet(c, (sx) => (
    <g key={sx}>
      <P d={shoe(c.b, sx, { width: 8, top: c.b.ankleY + 9, toe: 3 })} c={c} />
      <rect x={footX(c.b, sx) - 2 + 6 * sx} y={c.b.soleY - 2} width={4} height={4} rx={1} fill={c.dark} />
    </g>
  ))

const flat: Renderer = (c) =>
  feet(c, (sx) => (
    <g key={sx}>
      <P d={shoe(c.b, sx, { width: 8.5, top: c.b.ankleY + 10, toe: 3 })} c={c} />
      {sole(c, sx, 1.8, c.dark)}
    </g>
  ))

const sandal: Renderer = (c) =>
  feet(c, (sx) => {
    const x = footX(c.b, sx) + 2 * sx
    const s = c.b.soleY
    return (
      <g key={sx}>
        <rect x={x - 12} y={s - 3} width={24} height={3} rx={1.5} fill={c.fill} stroke={c.stroke} strokeWidth={0.8} />
        {c.variant === 'naal' || c.variant === 'slide' ? (
          <rect x={x - 10} y={s - (c.variant === 'slide' ? 13 : 15)} width={20} height={c.variant === 'slide' ? 8 : 7} rx={3} fill={c.fill} stroke={c.stroke} strokeWidth={0.8} />
        ) : (
          <>
            <rect x={x - 10} y={s - 12} width={20} height={3.5} rx={1.5} fill={c.fill} stroke={c.stroke} strokeWidth={0.6} />
            <rect x={x - 8} y={s - 20} width={16} height={3} rx={1.5} fill={c.fill} stroke={c.stroke} strokeWidth={0.6} />
          </>
        )}
      </g>
    )
  })

// ---------- head ----------

const face = (c: PartCtx, scale = 1) => {
  const f = faceOpening(c.b, scale)
  return <ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill={c.skin} />
}

const HIJAB: Record<string, { drape: number; width: number; tight?: number }> = {
  default: { drape: 140, width: 31 },
  wrap: { drape: 146, width: 34 },
  sport: { drape: 112, width: 28, tight: 2 },
  shayla: { drape: 150, width: 33 },
  loose: { drape: 124, width: 29 },
}

const hijab: Renderer = (c) => {
  const v = HIJAB[c.variant ?? 'default'] ?? HIJAB.default
  const { b } = c
  if (c.variant === 'turban') {
    // Wrapped over the hair and ears with a knot at the front; the neck stays uncovered.
    const { cy, rx, ry } = b.head
    return (
      <>
        <path
          d={M([b.cx - rx - 3, cy + 6]) + Q([b.cx - rx - 6, cy - ry - 10], [b.cx, cy - ry - 9]) + Q([b.cx + rx + 6, cy - ry - 10], [b.cx + rx + 3, cy + 6]) + Q([b.cx + rx - 2, cy - 8], [b.cx, cy - 13]) + Q([b.cx - rx + 2, cy - 8], [b.cx - rx - 3, cy + 6]) + ' Z'}
          fill={c.fill}
          stroke={c.stroke}
          strokeWidth={SW}
        />
        <ellipse cx={b.cx} cy={cy - ry - 3} rx={7} ry={5} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
        <Line c={c} d={M([b.cx - rx, cy - 14]) + Q([b.cx, cy - 26], [b.cx + rx, cy - 14])} color={c.dark} w={1} />
      </>
    )
  }
  return (
    <>
      <P d={headCover(b, { drapeY: v.drape, width: v.width, tight: v.tight })} c={c} />
      {face(c, c.variant === 'sport' ? 0.98 : 1)}
      <path d={M([b.cx - 14, b.head.cy - 12]) + Q([b.cx, b.head.cy - 22], [b.cx + 14, b.head.cy - 12])} fill="none" stroke={c.dark} strokeWidth={1.4} opacity={0.6} />
      {c.variant === 'shayla' && (
        <path d={M([b.cx + 16, b.head.cy + 20]) + Q([b.cx + 4, 112], [b.cx - 30, 128]) + L([b.cx - 26, 142]) + Q([b.cx + 8, 124], [b.cx + 24, b.head.cy + 30]) + ' Z'} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      )}
      {c.variant === 'wrap' && <Line c={c} d={M([b.cx - 24, 104]) + Q([b.cx, 116], [b.cx + 24, 104])} color={c.dark} w={1} />}
    </>
  )
}

const shemagh: Renderer = (c) => {
  const { b } = c
  const { cy, rx, ry } = b.head
  // Cloth over the head that falls past the shoulders, open at the front below the chin.
  const left: Pt[] = [[b.cx - 13, cy - ry - 4.5], [b.cx - rx - 6, cy - 12], [b.cx - rx - 8, cy + 16], [b.cx - b.shoulder + 4, 104], [b.cx - b.shoulder - 1, 134]]
  const right = mirrorPts([...left].reverse())
  const d =
    M(mirror(left[0])) +
    Q([b.cx, cy - ry - 10], left[0]) +
    curveThrough(left) +
    Q([b.cx - 24, 136], [b.cx - 17, 128]) +
    // Open at the front from the chin down, so the neck and the thobe collar show between the two sides.
    Q([b.cx - 13, 104], [b.cx - 10, 90]) +
    Q([b.cx - 8.6, 78], [b.cx - 8.6, 66]) +
    Q([b.cx, 58], [b.cx + 8.6, 66]) +
    Q([b.cx + 8.6, 78], [b.cx + 10, 90]) +
    Q([b.cx + 13, 104], [b.cx + 17, 128]) +
    Q([b.cx + 24, 136], right[0]) +
    curveThrough(right) +
    ' Z'
  return (
    <>
      <path d={d} fill={c.fill} stroke={c.stroke} strokeWidth={SW} strokeLinejoin="round" />
      {face(c, 1.04)}
      <ellipse cx={b.cx} cy={cy - ry + 3} rx={rx + 3} ry={4.5} fill="none" stroke="#1F1F21" strokeWidth={3} />
      <ellipse cx={b.cx} cy={cy - ry + 9} rx={rx + 4} ry={4.5} fill="none" stroke="#1F1F21" strokeWidth={3} />
    </>
  )
}

const cap: Renderer = (c) => {
  const { b } = c
  const y = b.head.cy - 9
  return (
    <>
      <P d={capDome(b, y)} c={c} />
      <path d={M([b.cx - 20, y]) + Q([b.cx, y + 8], [b.cx + 20, y]) + Q([b.cx, y + 3], [b.cx - 20, y]) + ' Z'} fill={c.dark} />
      <circle cx={b.cx} cy={b.head.cy - b.head.ry - 6} r={1.6} fill={c.dark} />
    </>
  )
}

const beanie: Renderer = (c) => {
  const { b } = c
  const y = b.head.cy - 6
  return (
    <>
      <P d={capDome(b, y)} c={c} />
      <rect x={b.cx - b.head.rx - 2} y={y - 9} width={(b.head.rx + 2) * 2} height={9} rx={3} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      {[-12, -4, 4, 12].map((dx) => (
        <Line key={dx} c={c} d={M([b.cx + dx, y - 8]) + L([b.cx + dx, y - 1])} color={c.dark} w={0.8} />
      ))}
    </>
  )
}

const sunhat: Renderer = (c) => {
  const { b } = c
  const y = b.head.cy - 10
  return (
    <>
      <ellipse cx={b.cx} cy={y + 1} rx={46} ry={9} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      <P d={capDome(b, y)} c={c} />
      <path d={M([b.cx - b.head.rx, y - 4]) + Q([b.cx, y], [b.cx + b.head.rx, y - 4])} fill="none" stroke={c.dark} strokeWidth={3} />
    </>
  )
}

const bucket: Renderer = (c) => {
  const { b } = c
  const y = b.head.cy - 10
  return (
    <>
      <path d={M([b.cx - 33, y + 6]) + L([b.cx - 22, y - 4]) + L([b.cx + 22, y - 4]) + L([b.cx + 33, y + 6]) + Q([b.cx, y + 11], [b.cx - 33, y + 6]) + ' Z'} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      <P d={capDome(b, y - 2)} c={c} />
    </>
  )
}

/** Hair shown when nothing covers the head (and under caps). */
export const hairFront = (b: Body, color: string) => <path d={b.gender === 'female' ? longHairFront(b) : shortHair(b)} fill={color} />
export const hairBack = (b: Body, color: string) => <path d={longHairBack(b)} fill={color} />

// ---------- eyewear & accessories ----------

const sunglasses: Renderer = (c) => {
  const { b } = c
  const y = b.head.cy - 4
  return (
    <g>
      <rect x={b.cx - 15} y={y - 4} width={12} height={8} rx={3.5} fill={c.fill} opacity={0.92} />
      <rect x={b.cx + 3} y={y - 4} width={12} height={8} rx={3.5} fill={c.fill} opacity={0.92} />
      <path d={M([b.cx - 3, y - 1]) + Q([b.cx, y - 3], [b.cx + 3, y - 1])} fill="none" stroke={c.fill} strokeWidth={1.4} />
    </g>
  )
}

const scarf: Renderer = (c) => {
  const { b } = c
  if (c.variant === 'shemagh') {
    const { cy } = b.head
    return (
      <path
        d={M([b.cx - 17, cy + 4]) + Q([b.cx, cy + 10], [b.cx + 17, cy + 4]) + L([b.cx + 19, 98]) + Q([b.cx, 108], [b.cx - 19, 98]) + ' Z'}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={SW}
      />
    )
  }
  return (
    <>
      <path d={M([b.cx - 15, 86]) + Q([b.cx, 94], [b.cx + 15, 86]) + L([b.cx + 16, 99]) + Q([b.cx, 108], [b.cx - 16, 99]) + ' Z'} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      <path d={M([b.cx - 12, 100]) + L([b.cx - 2, 102]) + L([b.cx - 4, 176]) + L([b.cx - 15, 174]) + ' Z'} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      {[0, 4, 8].map((dx) => (
        <Line key={dx} c={c} d={M([b.cx - 14 + dx, 174]) + L([b.cx - 14 + dx, 180])} w={1.2} />
      ))}
    </>
  )
}

const gloves: Renderer = (c) => {
  const { hand } = c.b
  return (
    <>
      <ellipse cx={hand.x} cy={hand.y} rx={hand.rx + 1} ry={hand.ry + 1} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      <ellipse cx={200 - hand.x} cy={hand.y} rx={hand.rx + 1} ry={hand.ry + 1} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
    </>
  )
}

const umbrella: Renderer = (c) => {
  const { hand } = c.b
  const x = hand.x - 2
  return (
    <>
      <path d={M([x, hand.y - 10]) + Q([x - 7, hand.y - 12], [x - 7, hand.y - 4])} fill="none" stroke="#3a3a3a" strokeWidth={2} strokeLinecap="round" />
      <line x1={x} y1={hand.y - 10} x2={x} y2={432} stroke="#3a3a3a" strokeWidth={1.6} />
      <path d={M([x, hand.y + 8]) + Q([x - 8, hand.y + 60], [x - 1.5, 412]) + L([x + 1.5, 412]) + Q([x + 8, hand.y + 60], [x, hand.y + 8]) + ' Z'} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
    </>
  )
}

/** Backpack straps (front); the bag body is drawn behind the character. */
const backpack: Renderer = (c) => {
  const { b } = c
  return (
    <>
      {[-1, 1].map((s) => (
        <path
          key={s}
          d={M([b.cx + s * 16, 97]) + L([b.cx + s * 23, 97]) + L([b.cx + s * (b.chest - 2), 176]) + L([b.cx + s * (b.chest - 8), 176]) + ' Z'}
          fill={c.fill}
          stroke={c.stroke}
          strokeWidth={SW}
        />
      ))}
    </>
  )
}

export const backpackBack = (c: PartCtx) => {
  const { b } = c
  const w = b.chest + 9
  return <rect x={b.cx - w} y={112} width={w * 2} height={104} rx={14} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
}

/** Draws a bag hanging from the right hand; `render` gets the bag's top-left corner. */
const inRightHand = (c: PartCtx, w: number, render: (x: number, y: number) => ReactNode) => (
  <>{render(200 - c.b.hand.x - w / 2, c.b.hand.y + 4)}</>
)

const briefcase: Renderer = (c) =>
  inRightHand(c, 34, (x, y) => (
    <>
      <path d={M([x + 11, y + 2]) + Q([x + 17, y - 6], [x + 23, y + 2])} fill="none" stroke={c.dark} strokeWidth={2} />
      <rect x={x} y={y + 2} width={34} height={24} rx={3} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      <line x1={x} y1={y + 10} x2={x + 34} y2={y + 10} stroke={c.dark} strokeWidth={0.8} />
    </>
  ))

const tote: Renderer = (c) =>
  inRightHand(c, 30, (x, y) => (
    <>
      <path d={M([x + 7, y + 6]) + Q([x + 15, y - 12], [x + 23, y + 6])} fill="none" stroke={c.dark} strokeWidth={2} />
      <path d={M([x + 2, y + 6]) + L([x + 28, y + 6]) + L([x + 31, y + 36]) + L([x - 1, y + 36]) + ' Z'} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      {c.variant === 'straw' &&
        [14, 22, 30].map((dy) => <Line key={dy} c={c} d={M([x + 1, y + dy]) + L([x + 29, y + dy])} color={c.dark} w={0.8} dash="2 1.5" />)}
    </>
  ))

const gymbag: Renderer = (c) =>
  inRightHand(c, 42, (x, y) => (
    <>
      <path d={M([x + 13, y + 6]) + Q([x + 21, y - 6], [x + 29, y + 6])} fill="none" stroke={c.dark} strokeWidth={2} />
      <rect x={x} y={y + 5} width={42} height={22} rx={10} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      <line x1={x + 6} y1={y + 12} x2={x + 36} y2={y + 12} stroke={c.dark} strokeWidth={1} />
    </>
  ))

const clutch: Renderer = (c) => {
  const { hand } = c.b
  return <rect x={hand.x - 12} y={hand.y - 2} width={24} height={14} rx={3} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
}

const crossbody: Renderer = (c) => {
  const { b } = c
  return (
    <>
      <path d={M([b.cx - 22, 96]) + L([b.cx + b.hip - 4, 214])} fill="none" stroke={c.dark} strokeWidth={2.4} />
      <rect x={b.cx + b.hip - 14} y={210} width={24} height={19} rx={4} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
    </>
  )
}

export const RENDERERS: Record<string, Renderer> = {
  ...PARTS_V12,
  tee,
  shirt,
  polo,
  sport,
  turtleneck,
  blouse,
  tank,
  tunic,
  thobe,
  dress,
  abaya,
  sweater,
  hoodie,
  fleece,
  cardigan,
  jacket,
  blazer,
  coat,
  puffer,
  bisht,
  farwa,
  trousers: trousersPart,
  shorts,
  skirt: skirtPart,
  socks,
  tights,
  sneaker,
  runner,
  oxford,
  loafer,
  boot,
  heel,
  flat,
  sandal,
  hijab,
  shemagh,
  cap,
  beanie,
  sunhat,
  bucket,
  sunglasses,
  scarf,
  gloves,
  umbrella,
  backpack,
  briefcase,
  tote,
  gymbag,
  clutch,
  crossbody,
  none: () => null,
}
