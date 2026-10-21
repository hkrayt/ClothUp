import {
  Briefcase,
  Coffee,
  Dumbbell,
  Gem,
  Gift,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Moon,
  MoonStar,
  Mountain,
  PartyPopper,
  Plane,
  ShoppingBag,
  UserCheck,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import occasionsData from '@/data/occasions.json'
import type { Occasion, OccasionId } from '@/engine/types'

export const OCCASIONS = occasionsData as Occasion[]

const ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  coffee: Coffee,
  gem: Gem,
  graduation: GraduationCap,
  dumbbell: Dumbbell,
  mountain: Mountain,
  landmark: Landmark,
  party: PartyPopper,
  plane: Plane,
  waves: Waves,
  'heart-handshake': HeartHandshake,
  moon: Moon,
  'user-check': UserCheck,
  utensils: UtensilsCrossed,
  gift: Gift,
  'moon-star': MoonStar,
  'shopping-bag': ShoppingBag,
}

export function getOccasion(id: OccasionId): Occasion {
  return OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[0]
}

export function OccasionIcon({ id, size = 20 }: { id: OccasionId; size?: number }) {
  const Icon = ICONS[getOccasion(id).icon] ?? Coffee
  return <Icon size={size} aria-hidden />
}
