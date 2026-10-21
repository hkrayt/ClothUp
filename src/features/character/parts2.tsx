/** Character parts added in v1.2: vests, jumpsuits, kaftans, swimwear, prayer cap, winter and sun accessories. */
import type { ReactNode } from 'react'
import { legLines, xAt, type Body } from './body'
import { L, M, Q } from './path'
import { capDome, openFront, sleeves, torso, trousers } from './shapes'
import type { PartCtx, Renderer } from './parts'

const SW = 1.1
const GOLD = '#C8A44C'

const P = ({ d, c, fill }: { d: string; c: PartCtx; fill?: string }) => (
  <path d={d} fill={fill ?? c.fill} stroke={c.stroke} strokeWidth={SW} strokeLinejoin="round" />
)
const Line = ({ d, c, color, w = 1, dash }: { d: string; c: PartCtx; color?: string; w?: number; dash?: string }) => (
  <path d={d} fill="none" stroke={color ?? c.stroke} strokeWidth={w} strokeLinecap="round" strokeDasharray={dash} />
)
const Sleeves = ({ c, endY, loose = 0, over = 0 }: { c: PartCtx; endY: number; loose?: number; over?: number }) => {
  const [l, r] = sleeves(c.b, { endY, loose, over })
  return (
    <>
      <P d={l} c={c} />
      <P d={r} c={c} />
    </>
  )
}
const wrist = (b: Body) => b.armOuter[3][1]

/** Sleeveless vest worn over the top: padded gilet or knit vest. */
export const vest: Renderer = (c) => {
  const { b } = c
  const puffer = c.variant === 'puffer'
  const hem = puffer ? 244 : 236
  const lines: ReactNode[] = []
  if (puffer) for (let y = 126; y < hem - 6; y += 22) lines.push(<Line key={y} c={c} d={M([b.cx - b.hip - 6, y]) + Q([b.cx, y + 4], [b.cx + b.hip + 6, y])} color={c.dark} />)
  return (
    <>
      <P d={torso(b, { hemY: hem, loose: puffer ? 4 : 2, over: puffer ? 4 : 2, neck: puffer ? 'high' : 'v' })} c={c} />
      {lines}
      {puffer ? (
        <Line c={c} d={M([b.cx, 72]) + L([b.cx, hem])} color={c.dark} w={1.4} />
      ) : (
        <path d={M([b.cx - b.hip - 4, hem - 6]) + L([b.cx + b.hip + 4, hem - 6]) + L([b.cx + b.hip + 4, hem + 1]) + L([b.cx - b.hip - 4, hem + 1]) + ' Z'} fill={c.dark} opacity={0.35} />
      )}
    </>
  )
}

/** One-piece with wide trousers; 'long' has long loose sleeves (modest). */
export const jumpsuit: Renderer = (c) => {
  const { b } = c
  const long = c.variant === 'long'
  return (
    <>
      <P d={trousers(b, { fit: 'wide', hemY: b.ankleY + 3 })} c={c} />
      <Sleeves c={c} endY={long ? wrist(b) : 146} loose={long ? 4 : 1} />
      <P d={torso(b, { hemY: b.waistY + 14, loose: long ? 4 : 2 })} c={c} />
      <Line c={c} d={M([b.cx - b.waist - 3, b.waistY + 6]) + Q([b.cx, b.waistY + 10], [b.cx + b.waist + 3, b.waistY + 6])} color={c.dark} w={2} />
    </>
  )
}

/** Kaftan / jalabiya: a wide robe with wide sleeves; 'open' is a short beach cover-up. */
export const kaftan: Renderer = (c) => {
  const { b } = c
  const trim = c.trim ?? (c.item.tags.includes('embroidered') ? GOLD : undefined)
  if (c.variant === 'open') {
    const [l, r] = openFront(b, { hemY: 330, loose: 8, flare: 8, over: 3, gapHem: 14, gapChest: 8, vBottomY: 300 })
    return (
      <>
        <Sleeves c={c} endY={176} loose={10} over={3} />
        <P d={l} c={c} />
        <P d={r} c={c} />
        {trim && <Line c={c} d={M([b.cx - 8, 96]) + L([b.cx - 9, 300]) + M([b.cx + 8, 96]) + L([b.cx + 9, 300])} color={trim} w={1.6} dash="3 2" />}
      </>
    )
  }
  return (
    <>
      <Sleeves c={c} endY={250} loose={14} />
      <P d={torso(b, { hemY: 418, loose: 9, flare: 16, neck: 'v' })} c={c} />
      {trim && (
        <>
          <Line c={c} d={M([b.cx - 9, 91]) + L([b.cx, 120]) + L([b.cx + 9, 91])} color={trim} w={2.2} />
          <Line c={c} d={M([b.cx, 120]) + L([b.cx, 260])} color={trim} w={1.8} dash="3 2" />
          <Line c={c} d={M([b.cx - b.hip - 22, 412]) + Q([b.cx, 420], [b.cx + b.hip + 22, 412])} color={trim} w={2} />
        </>
      )}
    </>
  )
}

/** Burkini: long loose swim tunic over slim swim trousers, long sleeves (swim hijab is the head item). */
export const burkini: Renderer = (c) => {
  const { b } = c
  return (
    <>
      <P d={trousers(b, { fit: 'slim', hemY: b.ankleY - 2 })} c={c} />
      <Sleeves c={c} endY={wrist(b) - 2} loose={2} />
      <P d={torso(b, { hemY: 300, loose: 4, flare: 4, neck: 'high' })} c={c} />
      <Line c={c} d={M([b.cx - b.chest - 2, 150]) + L([b.cx - b.hip - 6, 296])} color={c.dark} w={1.4} />
      <Line c={c} d={M([b.cx + b.chest + 2, 150]) + L([b.cx + b.hip + 6, 296])} color={c.dark} w={1.4} />
    </>
  )
}

/** One-piece swimsuit: wide neckline, cut at the top of the legs. */
export const swimsuit: Renderer = (c) => {
  const { b } = c
  const legs = legLines(b)
  const cut = b.crotchY + 4
  const outerX = b.cx - b.hip - 1
  const d =
    M([b.cx - 12, 96]) +
    Q([b.cx - b.shoulder + 6, 98], [b.cx - b.chest, b.chestY]) +
    L([b.cx - b.waist - 1, b.waistY]) +
    L([outerX, b.hipY]) +
    Q([xAt(legs.outer, cut) + 6, cut - 10], [b.cx - 6, cut]) +
    L([b.cx + 6, cut]) +
    Q([200 - xAt(legs.outer, cut) - 6, cut - 10], [200 - outerX, b.hipY]) +
    L([b.cx + b.waist + 1, b.waistY]) +
    L([b.cx + b.chest, b.chestY]) +
    Q([b.cx + b.shoulder - 6, 98], [b.cx + 12, 96]) +
    Q([b.cx, 112], [b.cx - 12, 96]) +
    ' Z'
  return <P d={d} c={c} />
}

/** Small white prayer cap. */
export const taqiyah: Renderer = (c) => {
  const { b } = c
  const y = b.head.cy - b.head.ry + 7
  return (
    <>
      <P d={capDome(b, y)} c={c} />
      {[-10, -3, 4, 11].map((dx) => (
        <circle key={dx} cx={b.cx + dx} cy={y - 7} r={0.9} fill={c.dark} />
      ))}
    </>
  )
}

/** Knit hat with ear flaps for freezing days. */
export const earflap: Renderer = (c) => {
  const { b } = c
  const { cy, rx } = b.head
  const y = cy - 6
  return (
    <>
      <P d={capDome(b, y)} c={c} />
      {[-1, 1].map((s) => (
        <rect key={s} x={s < 0 ? b.cx - rx - 3 : b.cx + rx - 7} y={y - 4} width={10} height={20} rx={5} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      ))}
      <circle cx={b.cx} cy={cy - b.head.ry - 10} r={4} fill={c.dark} />
    </>
  )
}

/** Tube scarf around the neck (can be pulled over the nose in dust). */
export const gaiter: Renderer = (c) => {
  const { b } = c
  return (
    <>
      <path d={M([b.cx - 14, 74]) + L([b.cx + 14, 74]) + L([b.cx + 16, 98]) + Q([b.cx, 104], [b.cx - 16, 98]) + ' Z'} fill={c.fill} stroke={c.stroke} strokeWidth={SW} />
      {[82, 90].map((y) => (
        <Line key={y} c={c} d={M([b.cx - 14, y]) + Q([b.cx, y + 3], [b.cx + 14, y])} color={c.dark} w={0.8} />
      ))}
    </>
  )
}

/** UV sleeves over the forearms. */
export const armsleeves: Renderer = (c) => {
  const { b } = c
  const top = 192
  const bottom = wrist(b) - 2
  const band = (mir: boolean) => {
    const f = (x: number) => (mir ? 200 - x : x)
    return (
      M([f(xAt(b.armOuter, top) - 1.5), top]) +
      L([f(xAt(b.armInner, top) + 1), top]) +
      L([f(xAt(b.armInner, bottom) + 1), bottom]) +
      L([f(xAt(b.armOuter, bottom) - 1.5), bottom]) +
      ' Z'
    )
  }
  return (
    <>
      <P d={band(false)} c={c} />
      <P d={band(true)} c={c} />
    </>
  )
}

export const PARTS_V12: Record<string, Renderer> = { vest, jumpsuit, kaftan, burkini, swimsuit, taqiyah, earflap, gaiter, armsleeves }
