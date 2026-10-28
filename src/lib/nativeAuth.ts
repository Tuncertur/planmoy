// Mağaza uygulamasında (iOS/Android) Google ve Apple ile giriş: gömülü WebView'da Google OAuth engellendiği için
// sistem tarayıcısı (iOS: SFSafariViewController) açılır; sağlayıcı sonrası uygulamaya özel adresle (com.planmoy.app://auth-callback)
// dönülür ve oturum burada kurulur. Web'de bu dosya kullanılmaz (normal yönlendirmeli akış).
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { Browser } from "@capacitor/browser";
import { supabase } from "./supabase";
import { isNativeApp } from "./paddle";

export const NATIVE_AUTH_REDIRECT = "com.planmoy.app://auth-callback";
export type OAuthProvider = "google";

/** Apple ile giriş yalnızca iOS uygulamasında (yerel Apple penceresi); web/Android'de gösterilmez. */
export function appleSignInAvailable(): boolean {
  return isNativeApp() && Capacitor.getPlatform() === "ios";
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Yerel Sign in with Apple → Supabase signInWithIdToken. Apple'a nonce'un SHA-256'sı, Supabase'e ham nonce gider. */
export async function signInWithAppleNative(): Promise<{ error?: string; canceled?: boolean }> {
  const raw = crypto.randomUUID() + crypto.randomUUID();
  try {
    const res = await SignInWithApple.authorize({
      clientId: "com.planmoy.app",
      redirectURI: "",
      scopes: "email name",
      state: crypto.randomUUID(),
      nonce: await sha256Hex(raw),
    });
    const token = res?.response?.identityToken;
    if (!token) return { error: "Apple kimlik belirteci alınamadı" };
    const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token, nonce: raw });
    return error ? { error: error.message } : {};
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel|1001/i.test(msg)) return { canceled: true };
    return { error: msg };
  }
}

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
  // Eklenti native tarafta kayıtlı değilse promise reddedilir; bu açılışı etkilememeli (yakalanmamış hata bırakma).
  App.addListener("appUrlOpen", async ({ url }) => {
    if (!url.startsWith(NATIVE_AUTH_REDIRECT)) return;
    try { await Browser.close(); } catch { /* Android'de gerekmeyebilir */ }
    await completeNativeOAuth(url);
  }).catch((e) => console.warn("[planmoy] appUrlOpen dinleyicisi kurulamadi", e));
}
