import { useId, type KeyboardEvent, type ReactNode } from 'react'
import type { Gender, Lang } from '@/engine/types'
import type { OutfitPiece, Pattern } from '@/engine/outfit-types'
import { COLORS } from '@/engine/catalog'
import { lightness, shade } from '@/engine/color'
import { cx } from '@/ui'
import { BODIES, HAIR, SKIN_TONES, VIEWBOX, type Body } from './body'
import { band, mirrorPts } from './path'
import { legsShape, torso } from './shapes'
import { RENDERERS, backpackBack, carried, hairBack, hairFront, type PartCtx } from './parts'

interface CharacterProps {
  pieces: OutfitPiece[]
  gender: Gender
  skinTone: number
  lang: Lang
  /** Item id of the highlighted piece. */
  selectedId?: string | null
  onSelect?: (piece: OutfitPiece | null) => void
  label: string
  className?: string
  /** Body proportions from height (sy) and build (sx); 1 is the default figure. */
  figure?: { sx: number; sy: number }
}

function mix(hex: string, other: string, t: number): string {
  const a = parseInt(hex.slice(1), 16)
  const b = parseInt(other.slice(1), 16)
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t)
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`
}

/** Outline and detail colors that stay visible on both light and very dark garments. */
function tones(hex: string): { stroke: string; dark: string } {
  const l = lightness(hex)
  if (l < 0.32) return { stroke: mix(hex, '#000000', 0.35), dark: mix(hex, '#ffffff', 0.28) }
  if (l > 0.93) return { stroke: '#BDB8AE', dark: '#D6D1C6' }
  return { stroke: shade(hex, 0.3), dark: shade(hex, 0.18) }
}

function BodySkin({ b, skin, uid }: { b: Body; skin: string; uid: string }) {
  const outline = shade(skin, 0.22)
  const arm = band(b.armOuter, [...b.armInner].reverse())
  const armR = band(mirrorPts(b.armOuter), mirrorPts([...b.armInner].reverse()))
  const legs = legsShape(b, b.hipY - 6)
  const footY = b.soleY - 6
  // Rounded limbs and a lit face: the same side shading as the clothes, a little softer.
  const shaded = { fill: `url(#${uid}-shade)`, stroke: 'none', opacity: 0.75 }
  return (
    <g fill={skin} stroke={outline} strokeWidth={0.8}>
      <path d={arm} />
      <path d={arm} {...shaded} />
      <path d={armR} />
      <path d={armR} {...shaded} />
      <ellipse cx={b.hand.x} cy={b.hand.y} rx={b.hand.rx} ry={b.hand.ry} />
      <ellipse cx={200 - b.hand.x} cy={b.hand.y} rx={b.hand.rx} ry={b.hand.ry} />
      <path d={legs} />
      <path d={legs} {...shaded} />
      <ellipse cx={b.cx - b.legOffset - 2} cy={footY} rx={8.5} ry={6} />
      <ellipse cx={b.cx + b.legOffset + 2} cy={footY} rx={8.5} ry={6} />
      <path d={torso(b, { hemY: b.hipY + 6, neck: 'crew' })} />
      <rect x={b.cx - b.neck.half} y={b.neck.top} width={b.neck.half * 2} height={b.neck.bottom - b.neck.top} stroke="none" />
      <rect x={b.cx - b.neck.half} y={b.neck.top} width={b.neck.half * 2} height={b.neck.bottom - b.neck.top} {...shaded} />
      <ellipse cx={b.cx} cy={b.head.cy} rx={b.head.rx} ry={b.head.ry} />
      <ellipse cx={b.cx} cy={b.head.cy} rx={b.head.rx} ry={b.head.ry} {...shaded} opacity={0.5} />
    </g>
  )
}

function PieceFill({ id, pattern, base, accent }: { id: string; pattern: Pattern; base: string; accent: string }) {
  if (pattern === 'stripes')
    return (
      <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill={base} />
        <rect x="0" width="1.6" height="6" fill={accent} />
      </pattern>
    )
  if (pattern === 'check')
    return (
      <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill={base} />
        <rect width="10" height="3" fill={accent} opacity={0.45} />
        <rect width="3" height="10" fill={accent} opacity={0.45} />
      </pattern>
    )
  return (
    <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
      <rect width="14" height="14" fill={base} />
      <circle cx="4" cy="4" r="2.2" fill={accent} />
      <circle cx="11" cy="10" r="1.6" fill={accent} opacity={0.8} />
      <circle cx="4" cy="4" r="0.8" fill={base} />
    </pattern>
  )
}

/** Draw order, back to front. Accessories are split by where they sit on the body. */
// Bag straps sit on the upper-body clothes but under scarves, hijabs and shemaghs.
const ORDER = ['tights', 'socks', 'shoes', 'bottom', 'top', 'tie', 'mid', 'outer', 'straps', 'neck', 'head', 'eyewear', 'hands'] as const
type Layer = (typeof ORDER)[number]

function layerOf(p: OutfitPiece): Layer | null {
  const part = p.item.svg.part
  if (part === 'none') return null
  if (p.slot === 'socks') return part === 'tights' ? 'tights' : 'socks'
  if (p.slot === 'accessory') {
    if (part === 'scarf' || part === 'gaiter') return 'neck'
    if (part === 'armsleeves') return 'straps'
    if (part === 'backpack' || part === 'crossbody') return 'straps'
    if (part === 'tie') return 'tie'
    return 'hands'
  }
  return p.slot as Layer
}

/** Where the feet stand; the figure is scaled from this point. */
const GROUND = { x: 100, y: 440 }

export function Character({ pieces, gender, skinTone, lang, selectedId, onSelect, label, className, figure }: CharacterProps) {
  const { sx = 1, sy = 1 } = figure ?? {}
  // A taller figure needs room above the head (the top of the head sits at y≈18).
  const top = Math.min(0, Math.floor(GROUND.y - (GROUND.y - 16) * sy))
  const scaled = sx !== 1 || sy !== 1
  const transform = scaled ? `translate(${GROUND.x} ${GROUND.y}) scale(${sx} ${sy}) translate(${-GROUND.x} ${-GROUND.y})` : undefined
  const uid = useId().replace(/:/g, '')
  const b = BODIES[gender]
  const skin = SKIN_TONES[skinTone] ?? SKIN_TONES[2]
  const head = pieces.find((p) => p.slot === 'head')
  const coversHair = !!head && head.item.tags.some((t) => ['hijab', 'head-cover', 'shemagh'].includes(t))
  const backpack = pieces.find((p) => p.item.svg.part === 'backpack')

  // Patterned pieces (stripes, check, floral) get their own fill pattern in the piece's two colors.
  const patternFill = (p: OutfitPiece) =>
    p.pattern && p.pattern !== 'embroidery' && p.color && p.patternColor ? `${uid}-${p.slot}-${p.item.id}` : null

  const ctxFor = (p: OutfitPiece): PartCtx => {
    const hex = p.color ? COLORS.hex(p.color) : '#9AA0A6'
    const def = p.color ? COLORS.color(p.color) : undefined
    const own = patternFill(p)
    const fill = def?.pattern ? `url(#${uid}-${def.pattern})` : own ? `url(#${own})` : hex
    const trim = p.pattern === 'embroidery' && p.patternColor ? COLORS.hex(p.patternColor) : undefined
    return { b, fill, ...tones(hex), variant: p.item.svg.variant, skin, item: p.item, patternId: uid, trim }
  }

  const interactive = !!onSelect
  const wrap = (p: OutfitPiece, node: ReactNode, key: string) => {
    const active = selectedId === p.item.id
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect?.(active ? null : p)
      }
    }
    return (
      <g
        key={key}
        className={cx('ch-part', active && 'ch-active', interactive && 'cursor-pointer')}
        data-slot={p.slot}
        filter={'url(#' + uid + '-depth)'}
        {...(interactive
          ? {
              role: 'button',
              tabIndex: 0,
              'aria-label': p.item.name[lang],
              'aria-pressed': active,
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation()
                onSelect?.(active ? null : p)
              },
              onKeyDown: onKey,
            }
          : {})}
      >
        {node}
      </g>
    )
  }

  const byLayer = new Map<Layer, OutfitPiece[]>()
  for (const p of pieces) {
    const layer = layerOf(p)
    if (!layer || (p.slot === 'outer' && p.carry)) continue
    byLayer.set(layer, [...(byLayer.get(layer) ?? []), p])
  }
  const carriedOuter = pieces.find((p) => p.slot === 'outer' && p.carry)

  return (
    <svg
      viewBox={`0 ${top} ${VIEWBOX.w} ${VIEWBOX.h - top}`}
      role="img"
      aria-label={label}
      className={cx('ch-root select-none', selectedId && 'ch-dim', className)}
      onClick={() => onSelect?.(null)}
    >
      <defs>
        {/* Light from the upper left: darker edges, a soft highlight left of centre. */}
        <linearGradient id={uid + '-shade'} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.2" />
          <stop offset="0.2" stopColor="#000" stopOpacity="0.04" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.62" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.86" stopColor="#000" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.24" />
        </linearGradient>
        {/* A soft shadow under each layer so it sits on top of the one below. */}
        <filter id={uid + '-depth'} x="-15%" y="-10%" width="130%" height="125%">
          <feDropShadow dx="0.6" dy="1.4" stdDeviation="1.1" floodColor="#000" floodOpacity="0.22" />
        </filter>
        <pattern id={`${uid}-check`} width="7" height="7" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill="#F7F4EE" />
          <path d="M0 3.5h7M3.5 0v7" stroke="#B3262E" strokeWidth="1.6" />
          <rect x="2.6" y="2.6" width="1.8" height="1.8" fill="#7E1A20" />
        </pattern>
        <pattern id={`${uid}-check-black`} width="7" height="7" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill="#F4F2EE" />
          <path d="M0 3.5h7M3.5 0v7" stroke="#2A2A2C" strokeWidth="1.6" />
          <rect x="2.6" y="2.6" width="1.8" height="1.8" fill="#111112" />
        </pattern>
        {pieces.map((p) => {
          const id = patternFill(p)
          return id ? <PieceFill key={id} id={id} pattern={p.pattern!} base={COLORS.hex(p.color!)} accent={COLORS.hex(p.patternColor!)} /> : null
        })}
      </defs>
      <ellipse cx={100} cy={444} rx={46 * sx} ry={6} fill="currentColor" opacity={0.08} />

      <g transform={transform}>
        {backpack && wrap(backpack, backpackBack(ctxFor(backpack)), 'backpack-back')}
        {gender === 'female' && !coversHair && hairBack(b, HAIR)}
        <BodySkin b={b} skin={skin} uid={uid} />

        {ORDER.map((layer) => (
          <g key={layer}>
            {layer === 'head' && !coversHair && hairFront(b, HAIR)}
            {(byLayer.get(layer) ?? []).map((p) => wrap(p, (RENDERERS[p.item.svg.part] ?? RENDERERS.none)(ctxFor(p)), `${layer}-${p.item.id}`))}
          </g>
        ))}

        {carriedOuter && wrap(carriedOuter, carried(ctxFor(carriedOuter)), 'carried')}
      </g>
    </svg>
  )
}
