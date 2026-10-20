import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.hkrayt.clothup',
  appName: 'ClothUp',
  webDir: 'dist',
  android: {
    // Release signing is configured in android/app/build.gradle from environment variables (CI secrets).
    allowMixedContent: false,
  },
}

export default config
