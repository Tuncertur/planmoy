import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Geliştirme sırasında sessizce yanlış davranmak yerine net uyarı ver.
  // PROJECT_RULES: "hiçbir ekran demo veri ile başlamaz" — bağlantı yoksa
  // bunu gizlemeyip açıkça göster.
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tanımlı değil. " +
      ".env dosyanızı .env.example'a göre doldurun."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");
