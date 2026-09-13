import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.planmoy.app',
  appName: 'Planmoy',
  webDir: 'mobile-web',
  ...(process.env['PLANMOY_MOBILE_URL']
    ? { server: { url: process.env['PLANMOY_MOBILE_URL'], cleartext: process.env['PLANMOY_MOBILE_URL'].startsWith('http://') } }
    : {}),
}

export default config
