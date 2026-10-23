// Mağaza ekran görüntüsü modu: YALNIZCA derleme zamanında VITE_SHOT_MODE=1 ile açılır (Codemagic "ios-screenshots" iş akışı).
// Normal/üretim derlemelerinde sabit false'tur ve Vite bu dalları ayıklar. Amaç: iOS Simulator'da elle dokunmadan
// ekranları sırayla gösterip `xcrun simctl io screenshot` ile görüntü almak.
export const SHOT_MODE = import.meta.env.VITE_SHOT_MODE === "1";
export const SHOT_INTERVAL_MS = 20000;
export const SHOT_VIEWS = ["flow", "tasks", "restaurants", "hotels", "places-to-visit", "discover", "calendar"] as const;
