import { useEffect } from 'react'
import i18n from '@/i18n'
import { setSystemBars } from '@/lib/native'
import { useSettings } from './settings'

const THEME_COLORS = { light: '#FAFAF7', dark: '#111316' }

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

/** Keeps <html> data-theme, lang and dir in sync with settings. */
export function useApplyAppearance() {
  const theme = useSettings((s) => s.theme)
  const language = useSettings((s) => s.language)

  useEffect(() => {
    const apply = () => {
      const resolved = theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = resolved
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[resolved])
      setSystemBars(resolved)
    }
    apply()
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.title = language === 'ar' ? 'لبسني' : 'ClothUp'
    if (i18n.language !== language) void i18n.changeLanguage(language)
  }, [language])
}
