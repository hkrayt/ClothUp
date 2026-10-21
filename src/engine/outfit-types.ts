import type { Gender, Localized, OccasionId, Style } from './types'

/** Body slots, drawn back-to-front in roughly this order. */
export type Slot = 'head' | 'eyewear' | 'outer' | 'mid' | 'top' | 'bottom' | 'socks' | 'shoes' | 'accessory'

export type Pattern = 'stripes' | 'check' | 'floral' | 'embroidery'

export type Coverage = {
  arms?: 'none' | 'short' | 'long'
  legs?: 'short' | 'knee' | 'long'
}

export interface ClothingItem {
  id: string
  slot: Slot
  /** Extra slots this item occupies, e.g. a dress or thobe also fills "bottom". */
  fills?: Slot[]
  name: Localized
  gender: Gender[]
  style: Style[]
  occasions: OccasionId[]
  /** 0 sporty · 1 relaxed · 2 smart casual · 3 business casual · 4 business/formal · 5 black tie */
  formality: number
  /** Comfortable feels-like range (°C) for this item. */
  feels: [number, number]
  tags: string[]
  coverage?: Coverage
  fabrics: string[]
  /** Allowed color ids or "@group" names from colors.json. */
  colors: string[]
  /** SVG part name and variant for the character renderer. */
  svg: { part: string; variant?: string }
  /** Patterns this item can come in; 'embroidery' items always show their trim. */
  patterns?: Pattern[]
}

/** A fabric. Its one-line "why" lives in i18n under fabric.why.<id>. */
export interface Fabric {
  id: string
  name: Localized
  /** 0 (coolest) – 5 (warmest). */
  warmth: number
  breathable: boolean
  waterproof?: boolean
}

/** A condition on the outfit context. All keys must match (AND); `any` matches if one sub-condition does. */
export type Condition = {
  [field: string]: { gte?: number; lte?: number; gt?: number; lt?: number; eq?: unknown; in?: unknown[]; nin?: unknown[]; ne?: unknown } | Condition[] | undefined
  any?: Condition[]
}

export interface RuleEffect {
  /** Slots that must be filled (e.g. "outer" when it rains). */
  need?: Slot[]
  /** Item in slot must carry at least one of these tags. */
  require?: Partial<Record<Slot, string[]>>
  /** Items with any of these tags are removed. */
  exclude?: string[]
  /** Tag → score bonus (negative to discourage). */
  prefer?: Record<string, number>
  /** Fabric → score bonus. */
  preferFabrics?: Record<string, number>
  /** Accessory/eyewear item ids or "#tag" to add if available for the profile. */
  add?: string[]
  /** Mark these slots as "take with you" rather than "wear now". */
  carry?: Slot[]
}

export interface Rule {
  id: string
  /** Higher priority rules win conflicts; occasion/modesty rules are 100, safety 80, comfort 50, style 20. */
  priority: number
  when: Condition
  then: RuleEffect
  /** i18n key under "reason" shown in the outfit's "Why this outfit" list. */
  reason?: string
  /** Set when loading: which rules file it came from. */
  group?: 'occasion' | 'weather'
}

export interface OutfitPiece {
  slot: Slot
  item: ClothingItem
  /** The fabric suggested for this weather. */
  fabric: string
  /** True for a layer to take along (e.g. for the evening) rather than wear now. */
  carry?: boolean
  /** Assigned color id (set by the color engine). */
  color?: string
  /** Pattern drawn on the piece, and its second color (set by the color engine). */
  pattern?: Pattern
  patternColor?: string
}

export interface Reason {
  key: string
  params?: Record<string, string | number>
}

export interface Outfit {
  id: string
  pieces: OutfitPiece[]
  score: number
  reasons: Reason[]
  /** Set by the color engine. */
  palette?: import('./color').PaletteResult
}

/** Everything a rule condition can look at. */
export interface OutfitInput {
  gender: Gender
  style: Style
  occasion: OccasionId
}
