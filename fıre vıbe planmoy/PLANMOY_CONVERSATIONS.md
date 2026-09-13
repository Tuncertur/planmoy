# Planmoy — Available Conversation Record

This file records the conversation messages available in the current FireVibe workspace context. It is included for handoff; it is not a platform-generated export of messages outside this context.

## Project identity
- User-facing app name: Planmoy.
- Product: online appointment system for beauty & wellness, healthcare, education and consulting.
- Tone: modern, trustworthy, clear and reassuring.
- Visual direction: deep-space navy, starfield, orbital lines, cyan/violet accents, with a polished SaaS foundation.
- Payment/checkout functionality should not be added.

## Platform and discovery requirements
- Provide web, Android and iOS project targets.
- Nearby discovery: 50 km Monday–Thursday and 100 km Friday–Sunday, sorted nearest first.
- Categories include restaurants, manicure, pedicure, massage, sauna, pool, hammam, haircut, stylist, barber, hairdresser and places to visit.
- Google ratings require a server-side Google Places connector.

## Security request
The user asked whether JSON code is hidden, whether queries are unlimited or limited, whether there are security vulnerabilities, and whether API keys are visible in the frontend. The security handoff states that secrets must remain server-side, public endpoints need validation/rate limits, and the memory-based limiter is not globally shared across multiple production instances.

## Export requests
- The user requested iOS, Android and web files.
- The user then requested a ZIP containing the project and the conversation information.
- The user asked where the files can be found on Windows.
- This archive provides the source project, native Capacitor projects and documentation. It does not include signed APK, AAB or IPA binaries.

## Honest limitations
- iOS build/signing requires macOS and Xcode.
- Android release signing/build requires Android Studio and the Android SDK.
- The browser/native shells do not by themselves provide completed flashlight, microphone, background remote control or music synchronization features.
- The platform-managed `.env` is excluded so secrets are not exported.
