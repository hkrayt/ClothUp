import male from '@/data/clothing/male.json'
import female from '@/data/clothing/female.json'
import shared from '@/data/clothing/shared.json'
import fabrics from '@/data/fabrics.json'
import occasionRules from '@/data/rules/occasion.json'
import weatherRules from '@/data/rules/weather.json'
import occasions from '@/data/occasions.json'
import colors from '@/data/colors/colors.json'
import palettes from '@/data/colors/palettes.json'
import type { ClothingItem, Fabric, Rule } from './outfit-types'
import type { Occasion } from './types'
import { ColorEngine, type ColorData } from './color'

export interface EngineData {
  items: ClothingItem[]
  rules: Rule[]
  fabrics: Fabric[]
  occasions: Occasion[]
  colors: ColorData
}

/** The bundled catalog. Everything here is plain JSON in src/data — see docs/DATA_GUIDE.md. */
export const DATA: EngineData = {
  items: [...male, ...female, ...shared] as ClothingItem[],
  rules: [
    ...(occasionRules as Rule[]).map((r) => ({ ...r, group: 'occasion' as const })),
    ...(weatherRules as Rule[]).map((r) => ({ ...r, group: 'weather' as const })),
  ],
  fabrics: fabrics as Fabric[],
  occasions: occasions as Occasion[],
  colors: { ...(colors as Omit<ColorData, 'palettes'>), palettes } as ColorData,
}

export const COLORS = new ColorEngine(DATA.colors)

const byId = new Map(DATA.items.map((i) => [i.id, i]))

export function getItem(id: string): ClothingItem | undefined {
  return byId.get(id)
}
