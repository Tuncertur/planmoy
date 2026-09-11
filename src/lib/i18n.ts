/**
 * Planmoy i18n çekirdeği.
 *
 * PLANMANY DERSİ: `dil === 'tr' ? 'X' : 'Y'` gibi iki-dilli ternary'ler asla
 * yazılmayacak. Üçüncü bir dil seçildiğinde bu kalıp sessizce yanlış dile
 * düşer ve fark edilmesi çok zor olur (Planmany'de 160 kez tekrarlanmıştı).
 *
 * Kural: Uygulamada görünen HER metin bir Dict nesnesi olarak tanımlanır ve
 * tt(dict) ile okunur. Yeni bir dil eklemek tek bir yerde (SUPPORTED_LANGS)
 * yapılır; tekil ternary aramaya gerek kalmaz.
 */

export const SUPPORTED_LANGS = [
  "tr",
  "en",
  "de",
  "fr",
  "es",
  "ar",
  "ru",
  "zh",
] as const;

export type Lang = (typeof SUPPORTED_LANGS)[number];

/** Bir metnin desteklenen dillerdeki karşılıkları. tr ve en zorunlu,
 *  diğerleri eksik olabilir — eksikse fallback zinciri devreye girer. */
export type Dict = { tr: string; en: string } & Partial<Record<Lang, string>>;

let activeLang: Lang = "tr";
const listeners = new Set<() => void>();

export function setActiveLang(lang: Lang) {
  activeLang = lang;
  listeners.forEach((fn) => fn());
}

export function getActiveLang(): Lang {
  return activeLang;
}

export function subscribeLang(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Aktif dile göre metni seçer.
 * Fallback zinciri: aktif dil -> en -> tr -> dict içindeki ilk değer.
 * Hiçbir zaman "undefined" veya boş dönmez; eksik çeviri sessizce
 * yutulmaz, geliştirme modunda konsola uyarı basar.
 */
export function tt(dict: Dict): string {
  const direct = dict[activeLang];
  if (direct) return direct;

  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[i18n] "${activeLang}" için çeviri eksik:`, dict);
  }

  if (dict.en) return dict.en;
  if (dict.tr) return dict.tr;

  const firstAvailable = Object.values(dict).find(Boolean);
  return firstAvailable ?? "";
}
