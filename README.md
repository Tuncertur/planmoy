# Planmoy

Kişisel yaşam asistanı + işletme randevu/CRM SaaS'ı. Web, iOS, Android (Capacitor).

## Kurulum

1. `npm install`
2. Planmoy'a özel (Planmany'den AYRI) bir Supabase projesi oluştur, `supabase/migrations/0001_core_schema.sql`'i çalıştır
3. `.env.example`'ı `.env.local` olarak kopyala, Supabase URL + anon key'i doldur
4. `npm run dev` (web) veya Android Studio ile `android/` klasörünü aç

## Android'de canlı test

```
npm run build
npx cap sync android
npx cap open android
```

Android Studio açıldığında bir emülatör veya USB bağlı cihazla Run'a bas.

Bkz. `PROJECT_RULES.md` — Planmany'den çıkarılan dersler, her fazda kontrol edilir.
