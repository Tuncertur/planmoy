import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { resetLocationSourceForUserChange } from "./useLocationSource";
import { resetTravelDataForUserChange } from "./useTravelData";

// KRİTİK (QA bulgusu — kullanıcı veri izolasyonu): konum ve seyahat
// verisi modül seviyesinde (kullanıcıya özel olmayan) önbelleklerde
// tutuluyor. Kullanıcı değişiminde (çıkış ya da farklı hesapla giriş)
// bunlar temizlenmezse, yeni kullanıcı kısa süreliğine bir önceki
// kullanıcının konum/liste verisini görebilir. Bu yüzden her oturum
// değişiminde (bir önceki kullanıcı farklıysa) önbellekler sıfırlanır.
export const SESSION_LOAD_TIMEOUT_MS = 8000;
let lastKnownUserId: string | null | undefined = undefined;

function resetAllUserScopedCaches() {
  resetLocationSourceForUserChange();
  resetTravelDataForUserChange();
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Açılış güvencesi: getSession() hata verir ya da hiç çözülmezse (WebView depolama/kilit sorunu) ekran sonsuza dek
    // boş kalmasın — süre dolunca oturumsuz kabul edilip giriş ekranı gösterilir.
    let settled = false;
    const finish = (s: Session | null) => {
      if (settled) return;
      settled = true;
      lastKnownUserId = s?.user.id ?? null;
      setSession(s);
      setLoading(false);
    };
    const watchdog = window.setTimeout(() => finish(null), SESSION_LOAD_TIMEOUT_MS);
    supabase.auth.getSession()
      .then(({ data }) => finish(data.session))
      .catch(() => finish(null))
      .finally(() => window.clearTimeout(watchdog));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const nextUserId = s?.user.id ?? null;
      if (lastKnownUserId !== undefined && nextUserId !== lastKnownUserId) {
        resetAllUserScopedCaches();
      }
      lastKnownUserId = nextUserId;
      setSession(s);
    });

    return () => { window.clearTimeout(watchdog); sub.subscription.unsubscribe(); };
  }, []);

  return { session, loading };
}
