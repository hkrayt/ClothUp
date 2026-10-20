import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { App } from '@capacitor/app'

const isNative = Capacitor.isNativePlatform()

/**
 * Android back button: close an open sheet first, then go back a screen, then leave the app.
 * (Without a handler the system would close the app straight from the result screen.)
 */
export function initBackButton() {
  if (!isNative) return
  void App.addListener('backButton', ({ canGoBack }) => {
    const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')
    if (dialog) dialog.close()
    else if (canGoBack) history.back()
    else void App.exitApp()
  })
}

/** Matches the status/navigation bar icons to the app theme. */
export function setSystemBars(theme: 'light' | 'dark') {
  if (!isNative) return
  void SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}
