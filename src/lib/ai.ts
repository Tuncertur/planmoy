import { supabase } from "./supabase";

export type AiResult = { ok: true; suggestion: string } | { ok: false; reason: string };

// Her kullanıcı eylemi için benzersiz kimlik: sunucu aynı kimlikle gelen tekrarı ÇİFT ücretlendirmez.
function newRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch { /* eski WebView */ }
  return "r" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function askAi(system: string, prompt: string): Promise<AiResult> {
  const { data, error } = await supabase.functions.invoke("ai-suggest", { body: { system, prompt, request_id: newRequestId() } });
  if (error) return { ok: false, reason: "provider-error" };
  if (!data.ok || !data.suggestion) return { ok: false, reason: data.reason ?? "empty" };
  return { ok: true, suggestion: data.suggestion };
}
