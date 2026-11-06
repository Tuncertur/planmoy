import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { parseUsage, type UsageState } from "./aiUsageCore";

// Sayaç SUNUCUDAN okunur (ai-usage). İstemci yalnızca "değişti" haberini verir; sayı hiçbir zaman istemcide hesaplanmaz/artırılmaz.
const listeners = new Set<() => void>();
export function notifyAiUsageChanged(): void { listeners.forEach((fn) => { try { fn(); } catch { /* dinleyici hatası akışı bozmasın */ } }); }

export async function fetchAiUsage(): Promise<UsageState> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-usage", { body: {} });
    if (error) return { kind: "unavailable" };
    return parseUsage(data);
  } catch { return { kind: "unavailable" }; }
}

export function useAiUsage(): { state: UsageState; reload: () => void } {
  const [state, setState] = useState<UsageState>({ kind: "loading" });
  const reload = useCallback(() => {
    let alive = true;
    void fetchAiUsage().then((s) => { if (alive) setState(s); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    const stop = reload();
    listeners.add(reload);
    const onVis = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop?.(); listeners.delete(reload); document.removeEventListener("visibilitychange", onVis); };
  }, [reload]);
  return { state, reload };
}
