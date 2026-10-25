// Mağaza uygulamasında (iOS/Android) Google ve Apple ile giriş: gömülü WebView'da Google OAuth engellendiği için
// sistem tarayıcısı (iOS: SFSafariViewController) açılır; sağlayıcı sonrası uygulamaya özel adresle (com.planmoy.app://auth-callback)
// dönülür ve oturum burada kurulur. Web'de bu dosya kullanılmaz (normal yönlendirmeli akış).
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "./supabase";
import { isNativeApp } from "./paddle";

export const NATIVE_AUTH_REDIRECT = "com.planmoy.app://auth-callback";
export type OAuthProvider = "google" | "apple";

export async function startNativeOAuth(provider: OAuthProvider): Promise<{ error?: string }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: NATIVE_AUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { error: error?.message ?? "Giriş adresi alınamadı" };
  await Browser.open({ url: data.url });
  return {};
}

/** Geri dönüş adresinden oturum kurar. Yalnızca beklenen adres kabul edilir; belirteçler loglanmaz. */
export async function completeNativeOAuth(url: string): Promise<{ ok: boolean; error?: string }> {
  if (!url.startsWith(NATIVE_AUTH_REDIRECT)) return { ok: false, error: "beklenmeyen adres" };
  const u = new URL(url);
  const hash = new URLSearchParams(u.hash.replace(/^#/, ""));
  const providerError = u.searchParams.get("error_description") ?? hash.get("error_description");
  if (providerError) return { ok: false, error: providerError };
  const code = u.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  const access_token = hash.get("access_token");
  const refresh_token = hash.get("refresh_token");
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  return { ok: false, error: "oturum bilgisi yok" };
}

let started = false;
export function initNativeAuthListener() {
  if (started || !isNativeApp()) return;
  started = true;
  void App.addListener("appUrlOpen", async ({ url }) => {
    if (!url.startsWith(NATIVE_AUTH_REDIRECT)) return;
    try { await Browser.close(); } catch { /* Android'de gerekmeyebilir */ }
    await completeNativeOAuth(url);
  });
}
