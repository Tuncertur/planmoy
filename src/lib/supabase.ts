import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // PROJECT_RULES: "hiçbir ekran demo veri ile başlamaz" ve sessizce
  // yanlış davranmak yerine hatayı gizlemeden göster. createClient boş
  // stringle çağrılırsa senkron olarak fırlar ve tüm uygulamayı daha
  // render olmadan çökertir (siyah ekran) — bunun yerine geçerli bir
  // placeholder URL kullanıp App.tsx'te ayrı bir "yapılandırma eksik"
  // ekranı gösteriyoruz.
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tanımlı değil. " +
      ".env.local dosyanızı .env.example'a göre doldurup 'npm run build'i tekrar çalıştırın."
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? url : "https://placeholder.supabase.co",
  isSupabaseConfigured ? anonKey : "placeholder-anon-key"
);
