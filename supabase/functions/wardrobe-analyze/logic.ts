// Planmoy StyleSync — fotoğraftan kıyafet tanıma: SAF mantık (ağ/DB yok; Deno ve Node ile test edilir).
// Model çıktısına ASLA güvenilmez: şema doğrulanır, değerler izinli listelerle sınırlanır, güven etiketlenir.
// Bu dosya henüz hiçbir Edge Function'a bağlı DEĞİL ve deploy edilmedi.

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_ITEMS = 8;

export type ImageType = "jpeg" | "png" | "webp";

/** Dosya uzantısına/MIME'a değil, gerçek bayt imzasına bakar. */
export function detectImageType(b: Uint8Array): ImageType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  return null;
}

export type ImageCheck = { ok: true; type: ImageType } | { ok: false; reason: "empty" | "too-large" | "unsupported-type" };
export function checkImage(b: Uint8Array): ImageCheck {
  if (b.length === 0) return { ok: false, reason: "empty" };
  if (b.length > MAX_IMAGE_BYTES) return { ok: false, reason: "too-large" };
  const type = detectImageType(b);
  return type ? { ok: true, type } : { ok: false, reason: "unsupported-type" };
}

// Mevcut StyleSync kategorileri (StyleSyncScreen.tsx) ile birebir eşleşir; veritabanı değerleri değişmez.
export type Category = "Üst giyim" | "Alt giyim" | "Dış giyim" | "Ayakkabı" | "Aksesuar";
export const TYPE_TO_CATEGORY = {
  tisort: "Üst giyim", gomlek: "Üst giyim", kazak: "Üst giyim", bluz: "Üst giyim", sweatshirt: "Üst giyim", elbise: "Üst giyim",
  pantolon: "Alt giyim", sort: "Alt giyim", etek: "Alt giyim",
  ceket: "Dış giyim", kaban: "Dış giyim", mont: "Dış giyim", hirka: "Dış giyim",
  ayakkabi: "Ayakkabı", bot: "Ayakkabı", sandalet: "Ayakkabı",
  kolye: "Aksesuar", kupe: "Aksesuar", saat: "Aksesuar", canta: "Aksesuar", kemer: "Aksesuar", gozluk: "Aksesuar", atki: "Aksesuar", sapka: "Aksesuar", bileklik: "Aksesuar",
} as const satisfies Record<string, Category>;
export type GarmentType = keyof typeof TYPE_TO_CATEGORY;
export const GARMENT_TYPES = Object.keys(TYPE_TO_CATEGORY) as GarmentType[];

export const PATTERNS = ["duz", "cizgili", "ekose", "cicekli", "puantiyeli", "desenli"] as const;
export const SEASONS = ["ilkbahar", "yaz", "sonbahar", "kis", "tumu"] as const;
export type Pattern = (typeof PATTERNS)[number];
export type Season = (typeof SEASONS)[number];

export type Confidence = "high" | "medium" | "low";
export const HIGH_CONFIDENCE = 0.8;
export const MEDIUM_CONFIDENCE = 0.5;
export const MATERIAL_MIN_CONFIDENCE = 0.7; // kumaş görselden zor tahmin edilir: düşük güvende hiç doldurulmaz

export function confidenceLabel(c: number): Confidence {
  return c >= HIGH_CONFIDENCE ? "high" : c >= MEDIUM_CONFIDENCE ? "medium" : "low";
}

export type BBox = { ymin: number; xmin: number; ymax: number; xmax: number }; // 0–1000
export type DetectedItem = {
  type: GarmentType | null;      // tanınmadıysa null
  category: Category | null;
  color: string | null;
  pattern: Pattern | null;
  material: string | null;       // yalnız güven ≥0,70 iken; her zaman "tahmin" olarak gösterilir
  season: Season | null;
  confidence: number;            // 0–1 (model beyanı; KALİBRE DEĞİL — arayüz yüzde değil etiket gösterir)
  confidenceLabel: Confidence;
  prefill: boolean;              // false → alanlar boş bırakılır, kullanıcı elle girer
  bbox: BBox | null;
};
export type Analysis = { items: DetectedItem[]; dropped: number };

/** Kullanıcı arayüzüne gidecek serbest metni temizler: kontrol karakteri, bağlantı, işaretleme, uzunluk. */
export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f\u007f<>`]/g, " ").replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return s.length ? s : null;
}

function clamp01(n: unknown): number {
  const x = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.min(1, Math.max(0, x));
}

function parseBBox(v: unknown): BBox | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const vals = [o.ymin, o.xmin, o.ymax, o.xmax];
  if (!vals.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const [ymin, xmin, ymax, xmax] = (vals as number[]).map((n) => Math.round(Math.min(1000, Math.max(0, n))));
  if (ymax - ymin < 20 || xmax - xmin < 20) return null; // anlamsız/çok küçük kutu
  return { ymin, xmin, ymax, xmax };
}

/** Gemini JSON'unu (metin ya da nesne) güvenli ve sınırlı bir sonuca çevirir. Geçersizse null. */
export function normalizeAnalysis(raw: unknown): Analysis | null {
  let data: unknown = raw;
  if (typeof raw === "string") {
    const t = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { data = JSON.parse(t); } catch { return null; }
  }
  const list = data && typeof data === "object" ? (data as { items?: unknown }).items : undefined;
  if (!Array.isArray(list)) return null;

  const items: DetectedItem[] = [];
  let dropped = 0;
  for (const r of list) {
    if (items.length >= MAX_ITEMS) { dropped++; continue; }
    if (!r || typeof r !== "object") { dropped++; continue; }
    const o = r as Record<string, unknown>;
    const typeStr = typeof o.type === "string" ? o.type.trim().toLowerCase() : "";
    const type = (GARMENT_TYPES as string[]).includes(typeStr) ? (typeStr as GarmentType) : null;
    let confidence = clamp01(o.confidence);
    if (!type) confidence = Math.min(confidence, MEDIUM_CONFIDENCE - 0.01); // tür bilinmiyorsa asla "orta/yüksek" görünmesin
    const label = confidenceLabel(confidence);
    const patternStr = typeof o.pattern === "string" ? o.pattern.trim().toLowerCase() : "";
    const seasonStr = typeof o.season === "string" ? o.season.trim().toLowerCase() : "";
    const prefill = label !== "low";
    items.push({
      type,
      category: type ? TYPE_TO_CATEGORY[type] : null,
      color: prefill ? cleanText(o.color, 30) : null,
      pattern: prefill && (PATTERNS as readonly string[]).includes(patternStr) ? (patternStr as Pattern) : null,
      material: confidence >= MATERIAL_MIN_CONFIDENCE ? cleanText(o.material, 30) : null,
      season: prefill && (SEASONS as readonly string[]).includes(seasonStr) ? (seasonStr as Season) : null,
      confidence,
      confidenceLabel: label,
      prefill,
      bbox: parseBBox(o.bbox),
    });
  }
  return { items, dropped };
}
