import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Kullanıcının aktif abonelik planı: "free" | "personal" | "solo" | "studio".
// null = henüz yükleniyor. Abonelik yoksa ya da aktif değilse "free".
// Sunucu (discover fonksiyonu) planı KENDİ kontrol eder; bu hook yalnızca gereksiz
// istek atmamak ve doğru ekranı göstermek içindir.
const cache = new Map<string, { plan: string; at: number }>();
const TTL_MS = 60_000;

export function usePlan(userId: string): string | null {
  const [plan, setPlan] = useState<string | null>(() => cache.get(userId)?.plan ?? null);

  useEffect(() => {
    const hit = cache.get(userId);
    if (hit && Date.now() - hit.at < TTL_MS) {
      setPlan(hit.plan);
      return;
    }
    let cancelled = false;
    supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle()
      .then(
        ({ data }) => {
          const value = data?.status === "active" ? (data.plan ?? "free") : "free";
          cache.set(userId, { plan: value, at: Date.now() });
          if (!cancelled) setPlan(value);
        },
        () => {
          if (!cancelled) setPlan("free");
        }
      );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return plan;
}
