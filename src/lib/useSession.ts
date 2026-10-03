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
let lastKnownUserId: string | null | undefined = undefined;

function resetAllUserScopedCaches() {
  resetLocationSourceForUserChange();
  resetTravelDataForUserChange();
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      lastKnownUserId = data.session?.user.id ?? null;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const nextUserId = s?.user.id ?? null;
      if (lastKnownUserId !== undefined && nextUserId !== lastKnownUserId) {
        resetAllUserScopedCaches();
      }
      lastKnownUserId = nextUserId;
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
