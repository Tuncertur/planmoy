import { safeGet, safeSet } from "./safeStorage";

// Hukuki onaylar (Kullanım Koşulları, Gizlilik, İade). Gizlilik ve Koşullar
// girişte zorunlu; İade bilgilendirme niteliğinde ve isteğe bağlı.
export type Consent = { terms: boolean; privacy: boolean; refund: boolean };

const KEY = "planmoy-consent-v1";

export function loadConsent(): Consent {
  const raw = safeGet(KEY);
  if (!raw) return { terms: false, privacy: false, refund: false };
  try {
    const v = JSON.parse(raw) as Partial<Consent>;
    return { terms: v.terms === true, privacy: v.privacy === true, refund: v.refund === true };
  } catch {
    return { terms: false, privacy: false, refund: false };
  }
}

export function saveConsent(c: Consent): void {
  safeSet(KEY, JSON.stringify({ ...c, at: new Date().toISOString() }));
}

export const consentOk = (c: Consent) => c.terms && c.privacy;
export const consentAll = (c: Consent) => c.terms && c.privacy && c.refund;
