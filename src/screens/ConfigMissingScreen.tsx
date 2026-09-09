import { AlertTriangle } from "lucide-react";

export function ConfigMissingScreen() {
  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <div className="orbit-card rise-in p-6">
        <AlertTriangle className="mx-auto text-[var(--color-gold-400)]" size={28} />
        <h1 className="mt-3 text-lg font-semibold">Supabase bağlantısı eksik</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-mist-300)]">
          <code className="rounded bg-white/10 px-1">.env.local</code> dosyasında{" "}
          <code className="rounded bg-white/10 px-1">VITE_SUPABASE_URL</code> ve{" "}
          <code className="rounded bg-white/10 px-1">VITE_SUPABASE_ANON_KEY</code> boş
          görünüyor. Dosyayı doldurduktan sonra{" "}
          <code className="rounded bg-white/10 px-1">npm run build</code> ve{" "}
          <code className="rounded bg-white/10 px-1">npx cap sync android</code> komutlarını
          tekrar çalıştırıp uygulamayı yeniden başlatın.
        </p>
      </div>
    </div>
  );
}
