import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.hkrayt.clothup',
  appName: 'ClothUp',
  webDir: 'dist',
  android: {
    // Release signing is configured in android/app/build.gradle from environment variables (CI secrets).
    allowMixedContent: false,
  },
  plugins: {
    // Edge-to-edge on Android 15+: the page uses viewport-fit=cover and env(safe-area-inset-*) padding.
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover' },
  },
}

export default config
