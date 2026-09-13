# Planmoy — Conversation Handoff

Date of this export: 2026-09-09

## Project identity and direction
- User-facing name: Planmoy.
- Product direction: online appointment system for beauty & wellness, healthcare, education and consulting.
- Tone: modern, trustworthy, clear and reassuring.
- Visual direction: polished SaaS UI with a deep-space navy/starfield atmosphere, orbital lines, and cyan/violet accents.
- Payment/checkout is not included; bookings remain payment-free unless an explicit integration is added.

## Requested platform targets
- Web, Android and iOS exports are part of the project.
- Existing native projects are Capacitor shells under `android/` and `ios/`.
- Web production output is generated into `dist/` with the project build command.

## Nearby discovery requirements
- Weekdays: discover businesses and places within 50 km.
- Friday, Saturday and Sunday: within 100 km.
- Nearest results first.
- Google business ratings are intended to come from a server-side Google Places connector.
- Requested fixed categories include restaurant, manicure, pedicure, massage, sauna, pool, hammam, haircut, stylist, barber, hairdresser and places to visit.

## Native light-control discussion
- The requested product direction included permission-based native mobile control.
- Safe implementation requires explicit user consent, native iOS/Android permissions, authenticated device sessions, admin authorization, an emergency stop, expiry and audit logging.
- A web browser alone cannot reliably control a phone flashlight. The current native projects are web-app shells; native flashlight, microphone, background remote control and music synchronization are not represented as completed native features unless separately implemented.

## Security discussion
- API secrets must remain server-side and must not be exposed in client bundles.
- Public/server endpoints should have validation, authentication where ownership is involved, and rate limiting.
- The project uses server-side environment access for integrations; the platform-managed `.env` is intentionally excluded from this export to avoid shipping secrets.
- A memory-based limiter is not a globally shared limiter across multiple production instances; a shared edge limiter would be needed for globally coordinated enforcement.

## Export discussion
- The project was requested as separate iOS, Android and web deliverables.
- This archive contains the source project and native directories, not signed App Store or Play Store binaries.
- iOS signing/build requires macOS and Xcode; Android release signing/build requires Android Studio/SDK.

## Export safety
- `.env`, dependency folders, VCS internals, and generated caches are excluded from the archive.
- The archive includes this handoff because the chat system does not persist a raw conversation transcript as a project file. It records the requirements and decisions available at export time; it is not a verbatim transcript.
