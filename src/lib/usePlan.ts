import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { effectivePlan } from "../../supabase/functions/_shared/entitlement";

// Kullanıcının aktif abonelik planı: "free" | "personal" | "solo" | "studio".
// null = henüz yükleniyor. Hak kuralları: _shared/entitlement.ts (past_due için 3 gün hoşgörü).
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
    // 0029 sütunları (past_due_since, cancel_at, scheduled_action) canlıda henüz yoksa sorgu hata verir:
    // bu durumda temel sütunlarla yeniden dene (ücretli kullanıcı yanlışlıkla "free" görünmesin).
    const load = async () => {
      const full = await supabase.from("subscriptions").select("plan, status, past_due_since, cancel_at, scheduled_action").eq("user_id", userId).maybeSingle();
      if (!full.error) return full.data;
      const basic = await supabase.from("subscriptions").select("plan, status").eq("user_id", userId).maybeSingle();
      return basic.error ? null : basic.data;
    };
    load().then(
      (data) => {
        const value = effectivePlan(data, Date.now());
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
