// Bölge anahtarı: YALNIZCA derleme zamanında VITE_REGION=ru ile açılır (RuStore APK'sı).
// Rusya'da yabancı kimlik servisleriyle (Google/Apple) giriş yasak (406-FZ + 7.7.2026 cezaları) → RU derlemesinde bu girişler gösterilmez.
// Normal (dünya) derlemelerinde sabit false'tur.
export const IS_RU_REGION = import.meta.env.VITE_REGION === "ru";
