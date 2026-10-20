import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Duration, OccasionId, Place, Profile, When } from '@/engine/types'
import { kvStorage } from '@/lib/storage'

export interface Plan {
  /** A known place id, or a full Place for the current location. */
  place: string | Place
  when: When
  duration: Duration
  occasion: OccasionId
}

interface AppState {
  profile: Profile | null
  plan: Plan
  /** How often each place was used, for "frequent places" chips. */
  placeUsage: Record<string, number>
  setProfile: (profile: Profile) => void
  updateProfile: (patch: Partial<Profile>) => void
  setPlan: (patch: Partial<Plan>) => void
  /** Records that a suggestion was requested for the current plan. */
  recordUse: () => void
  /** Item id → score bonus learned from swaps (chosen items up, replaced items down). */
  itemPrefs: Record<string, number>
  recordSwap: (fromId: string, toId: string) => void
  resetPrefs: () => void
}

const clampPref = (n: number) => Math.max(-4, Math.min(4, Math.round(n * 10) / 10))

export const DEFAULT_PLAN: Plan = { place: 'amman', when: { kind: 'now' }, duration: 3, occasion: 'casual' }

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      profile: null,
      plan: DEFAULT_PLAN,
      placeUsage: {},
      setProfile: (profile) => set({ profile }),
      updateProfile: (patch) => {
        const current = get().profile
        if (current) set({ profile: { ...current, ...patch } })
      },
      setPlan: (patch) => set({ plan: { ...get().plan, ...patch } }),
      recordUse: () => {
        const { plan, placeUsage } = get()
        if (typeof plan.place !== 'string') return
        set({ placeUsage: { ...placeUsage, [plan.place]: (placeUsage[plan.place] ?? 0) + 1 } })
      },
      itemPrefs: {},
      recordSwap: (fromId, toId) => {
        const p = { ...get().itemPrefs }
        p[toId] = clampPref((p[toId] ?? 0) + 1.5)
        p[fromId] = clampPref((p[fromId] ?? 0) - 1)
        set({ itemPrefs: p })
      },
      resetPrefs: () => set({ itemPrefs: {} }),
    }),
    {
      name: 'clothup.app',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      // A specific date/time is only meaningful for one trip; next launch starts from "now".
      partialize: (s) => ({
        profile: s.profile,
        placeUsage: s.placeUsage,
        itemPrefs: s.itemPrefs,
        plan: { ...s.plan, when: { kind: 'now' } as When },
      }),
    },
  ),
)

export function frequentPlaces(usage: Record<string, number>, limit = 3): string[] {
  return Object.entries(usage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
}
