import { useEffect, useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { useApp } from './store'
import { useSettings } from './settings'

export type Screen = 'home' | 'result'

interface NavState {
  screen: Screen
  go: (screen: Screen) => void
  back: () => void
}

/**
 * Two-screen navigation backed by browser history, so the Android back button
 * and the desktop/browser back gesture return from the result to the home screen.
 */
export const useNav = create<NavState>()((set, get) => ({
  screen: 'home',
  go: (screen) => {
    if (screen === get().screen) return
    if (screen !== 'home') history.pushState({ screen }, '')
    set({ screen })
    window.scrollTo({ top: 0 })
  },
  back: () => {
    if (get().screen !== 'home') history.back()
  },
}))

export function useHistorySync() {
  useEffect(() => {
    const onPop = (e: PopStateEvent) => useNav.setState({ screen: (e.state?.screen as Screen) ?? 'home' })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
}

function subscribeHydration(cb: () => void) {
  const a = useApp.persist.onFinishHydration(cb)
  const b = useSettings.persist.onFinishHydration(cb)
  return () => {
    a()
    b()
  }
}

/** True once persisted state has loaded (async on Android). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => useApp.persist.hasHydrated() && useSettings.persist.hasHydrated(),
  )
}
