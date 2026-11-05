import { supabase } from "./supabase";
import { notifyAiUsageChanged } from "./aiUsage";

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
  if (!data.ok || !data.suggestion) {
    if (data.reason === "query-limit" || data.reason === "cost-cap") notifyAiUsageChanged();
    return { ok: false, reason: data.reason ?? "empty" };
  }
  notifyAiUsageChanged(); // sayaç sunucudan yeniden okunur (istemci sayıyı kendisi artırmaz)
  return { ok: true, suggestion: data.suggestion };
}
