import { supabase } from "./supabase";

export type AiResult = { ok: true; suggestion: string } | { ok: false; reason: string };

export async function askAi(system: string, prompt: string): Promise<AiResult> {
  const { data, error } = await supabase.functions.invoke("ai-suggest", { body: { system, prompt } });
  if (error) return { ok: false, reason: "provider-error" };
  if (!data.ok || !data.suggestion) return { ok: false, reason: data.reason ?? "empty" };
  return { ok: true, suggestion: data.suggestion };
}
