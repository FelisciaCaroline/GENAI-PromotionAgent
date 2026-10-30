import "server-only";
import { generateObject } from "ai";
import { getGroq } from "@/lib/ai/groq";
import { langName } from "@/lib/ai/languages";
import { MODELS } from "@/lib/ai/models";
import { styleOf } from "@/lib/ai/styles";
import { PALETTES, PALETTE_IDS, TEMPLATE_IDS, TEMPLATE_META, type PaletteId, type TemplateId } from "@/lib/image/catalog";
import { composePoster, gradientBackground, SIZES, type Ratio } from "@/lib/image/compose";
import { normalizePhoto } from "@/lib/image/product";
import { removeBackground } from "@/lib/image/removeBg";
import { withRetry } from "@/lib/utils/retry";
import { ConceptsResultSchema, type ConceptsResult, type LanguageConfig, type PosterConcept, type PosterItem } from "./schemas";

export type PosterInput = {
  photo: Buffer | null;
  goal: string;
  produk: string;
  target: string;
  penawaran: string;
  periode: string;
  ratio: Ratio;
  bgMode: "ai" | "solid";
  languageConfig: LanguageConfig;
  hint?: string;
  count?: number;
};

export type PosterEvent =
  | { type: "concepts"; kategori: string; musiman: string; concepts: PosterConcept[]; cutout: string | null; note?: string }
  | { type: "poster"; index: number; url: string | null; error?: string; bgFallback?: boolean };

// Huruf poster memakai font Latin. Bahasa non-Latin dialihkan ke bahasa Latin terdekat.
const LATIN = ["id", "en", "ms", "es", "fr", "de", "pt", "jv", "su"];
export function posterLanguage(cfg: LanguageConfig): { code: string; fallback: boolean } {
  if (LATIN.includes(cfg.primary)) return { code: cfg.primary, fallback: false };
  const sec = cfg.secondary.find((c) => LATIN.includes(c));
  return { code: sec ?? "en", fallback: true };
}

export async function generateConcepts(i: PosterInput): Promise<ConceptsResult> {
  const lang = posterLanguage(i.languageConfig);
  const style = styleOf(i.languageConfig.style);
  const count = Math.min(4, Math.max(3, i.count ?? 3));
  const { object } = await withRetry(() =>
    generateObject({
      model: getGroq()(MODELS.smart),
      mode: "json",
      schema: ConceptsResultSchema,
      temperature: 0.9,
      system: `Kamu art director poster promosi UMKM Indonesia. Kenali kategori produk dan momen musiman, lalu buat ${count} KONSEP poster yang BERBEDA satu sama lain dan sesuai tema produk.

TEMPLATE yang tersedia (pilih templateId, tiap konsep WAJIB memakai template berbeda):
${TEMPLATE_META.map((t) => `- ${t.id}: ${t.fits}`).join("\n")}

PALET yang tersedia (paletteId): ${PALETTE_IDS.map((p) => `${p} (${PALETTES[p].label})`).join(", ")}.
Pilih palet sesuai suasana: Ramadan/lebaran -> ramadan; kopi/cokelat -> hangat_kopi; anak muda/kreatif -> pastel_scrapbook; malam/gaming -> neon_malam; sehat/organik -> segar_hijau; flash sale -> merah_promo; premium -> monokrom_elegan; minuman segar/laut -> biru_laut. Tiap konsep sebaiknya memakai palet berbeda.

ATURAN TEKS POSTER (bahasa: ${langName(lang.code)}, gaya: ${style.label}):
- headline maks 5 kata, subheadline maks 12 kata, cta maks 3 kata, badge maks 3 kata, discount maks 8 karakter.
- Tulis hanya huruf Latin. Angka, harga, dan diskon TIDAK boleh diubah atau dikarang di luar data pengguna. Jika tidak ada diskon, isi discount dengan label singkat seperti "PROMO" atau "NEW".
- Headline tiap konsep harus beda sudut pandang (urgensi, manfaat, rasa/emosi).
bgPrompt: bahasa Inggris, maks 40 kata, deskripsi LATAR suasana yang relevan dengan produk dan palet; wajib ada ruang kosong di tengah, tanpa teks, tanpa orang, tanpa logo, tanpa objek utama di tengah.`,
      prompt: `Tujuan: ${i.goal}
Produk: ${i.produk}
Target: ${i.target}
Penawaran: ${i.penawaran}
Periode: ${i.periode}
Rasio poster: ${i.ratio}${i.hint ? `\nPermintaan gaya tambahan dari pengguna: ${i.hint}` : ""}`,
    })
  );
  return sanitize(object, count);
}

// Pastikan template unik, teks tidak kepanjangan, dan seed tersedia
function sanitize(r: ConceptsResult, count: number): ConceptsResult {
  const used = new Set<TemplateId>();
  const free = [...TEMPLATE_IDS];
  const concepts = r.concepts.slice(0, count).map((c) => {
    let t = c.templateId;
    if (used.has(t)) t = free.find((x) => !used.has(x)) ?? t;
    used.add(t);
    return {
      ...c,
      templateId: t,
      headline: c.headline.trim().slice(0, 44),
      subheadline: c.subheadline.trim().slice(0, 90),
      discount: c.discount.trim().slice(0, 10),
      cta: c.cta.trim().slice(0, 24),
      badge: c.badge.trim().slice(0, 24),
    };
  });
  return { ...r, concepts };
}

const withSeed = (cs: ConceptsResult["concepts"]): PosterConcept[] => cs.map((c) => ({ ...c, seed: Math.floor(Math.random() * 900000) + 1 }));

async function fetchBackground(prompt: string, ratio: Ratio, seed: number): Promise<Buffer | null> {
  const { w, h } = SIZES[ratio];
  const pw = 768, ph = Math.round((pw * h) / w);
  const full = `${prompt}, no text, no letters, no logo, no people, uncluttered empty center, soft depth of field, high quality`;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=${pw}&height=${ph}&nologo=true&seed=${seed}&model=flux`;
  try {
    return await withRetry(async () => {
      const res = await fetch(url, { signal: AbortSignal.timeout(38_000) });
      if (!res.ok) throw new Error(`pollinations ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    }, 1, 800);
  } catch (e) {
    console.error("[designer:background]", e);
    return null;
  }
}

export type Product = { cutout: Buffer | null; photo: Buffer | null; note?: string };

export async function prepareProduct(raw: Buffer | null): Promise<Product> {
  if (!raw) return { cutout: null, photo: null };
  const photo = await normalizePhoto(raw);
  const cutout = await removeBackground(photo);
  return cutout
    ? { cutout, photo }
    : { cutout: null, photo, note: "Background foto tidak dihapus (REMOVEBG_API_KEY kosong atau gagal), jadi foto dipasang sebagai kartu." };
}

export async function renderPoster(o: { concept: PosterConcept; ratio: Ratio; bgMode: "ai" | "solid"; product: Product }): Promise<{ url: string; bgFallback: boolean }> {
  const c = o.concept;
  let bg: Buffer | null = null;
  if (o.bgMode === "ai") bg = await fetchBackground(c.bgPrompt, o.ratio, c.seed);
  const bgFallback = o.bgMode === "ai" && !bg;
  const background = bg ?? (await gradientBackground(c.paletteId as PaletteId, o.ratio, c.seed));
  const jpg = await composePoster({
    background,
    cutout: o.product.cutout,
    photo: o.product.photo,
    ratio: o.ratio,
    templateId: c.templateId,
    paletteId: c.paletteId,
    text: { headline: c.headline, subheadline: c.subheadline, discount: c.discount, cta: c.cta, badge: c.badge },
  });
  return { url: `data:image/jpeg;base64,${jpg.toString("base64")}`, bgFallback };
}

// Alur penuh: produk + konsep paralel, lalu render semua konsep paralel (emit per poster)
export async function runPosterSet(i: PosterInput, emit: (e: PosterEvent) => void = () => {}) {
  const [product, raw] = await Promise.all([prepareProduct(i.photo), generateConcepts(i)]);
  const concepts = withSeed(raw.concepts);
  const lang = posterLanguage(i.languageConfig);
  const notes = [product.note, lang.fallback ? "Poster memakai huruf Latin, jadi teks poster ditulis dalam bahasa Latin terdekat." : undefined].filter(Boolean).join(" ");
  emit({ type: "concepts", kategori: raw.kategori, musiman: raw.musiman, concepts, cutout: product.cutout ? `data:image/png;base64,${product.cutout.toString("base64")}` : null, note: notes || undefined });

  const posters: PosterItem[] = await Promise.all(
    concepts.map(async (concept, index): Promise<PosterItem> => {
      try {
        const r = await renderPoster({ concept, ratio: i.ratio, bgMode: i.bgMode, product });
        emit({ type: "poster", index, url: r.url, bgFallback: r.bgFallback });
        return { concept, url: r.url };
      } catch (e) {
        console.error("[designer:render]", e);
        const error = e instanceof Error ? e.message : "Render gagal";
        emit({ type: "poster", index, url: null, error });
        return { concept, url: null, error };
      }
    })
  );
  return { kategori: raw.kategori, musiman: raw.musiman, posters, cutoutUsed: Boolean(product.cutout), note: notes || undefined };
}
