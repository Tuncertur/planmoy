# Planmoy platform exports

Planmoy now has three export targets in this repository:

- **Web:** `bun run build` produces the deployable SSR web output in `dist/`. The web app remains the source of truth for authentication, database access and server functions.
- **iOS:** `ios/` is a Capacitor Xcode project.
- **Android:** `android/` is a Capacitor Gradle project.

## Connect the native shells

The native projects load the hosted Planmoy web application. Before syncing them, provide the URL only in the command environment (never commit it or put secrets in source):

```sh
PLANMOY_MOBILE_URL=https://your-planmoy-domain.example bun run mobile:sync
bun run mobile:open:ios
bun run mobile:open:android
```

For local device testing, use a reachable HTTPS tunnel or the computer's LAN address; `localhost` inside a phone means the phone itself. The fallback `mobile-web/index.html` is intentionally an honest setup screen when no URL is configured.

The current export is a cross-platform web/native shell. It does **not** yet claim native flashlight, microphone, background control or music-sync behavior: those require explicit Capacitor plugins, platform permission strings, a device-session protocol and user-consent screens before they can be safely shipped.

Apple builds require Xcode/macOS; Android builds require Android Studio/SDK. Those platform toolchains are not available in the web workspace, so the projects are exported and synced here but not signed or store-submitted.
