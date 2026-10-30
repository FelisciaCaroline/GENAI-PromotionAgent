import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { langName } from "@/lib/ai/languages";
import { designerProviders } from "@/lib/ai/provider";
import { isHex, mix, readable } from "@/lib/image/color";
import { SIZES, type Ratio } from "@/lib/image/compose";
import {
  BADGE_IDS, BG_IDS, DECOR_IDS, LAYOUT_IDS, LAYOUT_META, TYPE_IDS, TYPE_PRESETS,
  type DesignSpec,
} from "@/lib/image/design-catalog";
import { cleanText, renderDesign, type ProductAsset } from "@/lib/image/dynamic";
import { normalizePhoto } from "@/lib/image/product";
import { removeBackgroundDetailed, removeWhiteBackground, type RemoveBgType } from "@/lib/image/removeBg";
import { withRetry } from "@/lib/utils/retry";

// ======================================================================
// Prompt -> poster pipeline
//   1. LLM reads the free-text prompt -> brief + N distinct DesignSpecs
//   2. Subject: uploaded photo (or AI-generated product shot) -> remove.bg cutout
//   3. Per design: AI background (Pollinations) or gradient -> dynamic renderer
// ======================================================================

// ---------- LLM schema (lenient: invalid enum values fall back instead of failing)
const TextSchema = z.object({
  eyebrow: z.string().catch("").describe("Tiny label above the headline, 1-3 words, or empty"),
  headline: z.string().describe("Main hook, max 6 words"),
  emphasis: z.string().catch("").describe("ONE word (or two) copied exactly from the headline to highlight"),
  subheadline: z.string().catch("").describe("Supporting line, max 14 words"),
  highlight: z.string().catch("").describe("Big price/discount/date/'GRATIS' stamp, max 10 chars, only from the prompt; empty if none"),
  highlightLabel: z.string().catch("").describe("Tiny word above the highlight e.g. 'hemat', 'mulai', 'only'; or empty"),
  details: z.array(z.string()).catch([]).describe("0-3 short facts from the prompt: date/time, place, contact/handle. Never invent."),
  cta: z.string().catch("").describe("Call to action, max 3 words"),
  footer: z.string().catch("").describe("Brand name / @handle / website if given, else empty"),
});

const ColorsSchema = z.object({
  bg: z.string().describe("hex, dominant background"),
  surface: z.string().describe("hex, light card/paper colour"),
  text: z.string().describe("hex, main text colour readable on bg"),
  primary: z.string().describe("hex, brand/hero colour"),
  onPrimary: z.string().describe("hex, text colour on primary"),
  accent: z.string().describe("hex, contrasting pop colour"),
});

const SpecSchema = z.object({
  name: z.string().catch("Konsep").describe("Short concept name in Indonesian, 2-4 words"),
  alasan: z.string().catch("").describe("One sentence in Indonesian: why this concept fits"),
  layout: z.enum(LAYOUT_IDS).catch("stack_center"),
  align: z.enum(["left", "center"]).catch("center"),
  typography: z.enum(TYPE_IDS).catch("modern_bold"),
  headingCase: z.enum(["upper", "lower", "title", "normal"]).catch("normal"),
  colors: ColorsSchema,
  background: z.enum(BG_IDS).catch("gradient"),
  bgPrompt: z.string().catch("").describe("English prompt for the background image (scene/backdrop only)"),
  decor: z.array(z.enum(DECOR_IDS).catch("sparkles")).catch([]).describe("0-3 decorations"),
  badgeShape: z.enum(BADGE_IDS).catch("circle"),
  productSize: z.enum(["small", "medium", "large"]).catch("large"),
  text: TextSchema,
});

const BriefSchema = z.object({
  kind: z.string().catch("promo").describe("product_promo | event | announcement | food_menu | service | hiring | greeting | other"),
  subject: z.string().catch("").describe("Main subject in a few words (e.g. 'kopi susu gula aren')"),
  subjectType: z.enum(["product", "food", "person", "animal", "object", "none"]).catch("product"),
  showSubject: z.boolean().catch(true).describe("true if a photo/cutout of the subject should be the visual hero"),
  subjectPrompt: z.string().catch("").describe("English prompt for a studio photo of the subject alone (no background details)"),
  concepts: z.array(SpecSchema).min(1),
});
export type Brief = z.infer<typeof BriefSchema>;

export type PromptPosterInput = {
  prompt: string;
  photo: Buffer | null;
  ratio: Ratio;
  lang: string; // "auto" or ISO code
  count: number;
  aiSubject: boolean; // generate a subject photo when none was uploaded
  bgMode: "auto" | "solid"; // solid = never call the image API for backgrounds
};

export type PromptPosterEvent =
  | { type: "status"; message: string }
  | { type: "brief"; kind: string; subject: string; specs: DesignSpec[]; cutout: string | null; subjectSource: "upload" | "ai" | "none"; notes: string[] }
  | { type: "poster"; index: number; url: string | null; error?: string; bgFallback?: boolean };

const LATIN = ["id", "en", "ms", "es", "fr", "de", "pt", "jv", "su"];

function systemPrompt(count: number, lang: string, hasPhoto: boolean) {
  const langRule = lang === "auto"
    ? "Write ALL poster text in the same language as the user's prompt."
    : `Write ALL poster text in ${langName(LATIN.includes(lang) ? lang : "en")}.`;
  return `You are a senior art director and copywriter who designs scroll-stopping social media posters for small businesses (UMKM).
Read the user's request and return a brief plus ${count} poster concepts that are CLEARLY DIFFERENT from each other (different layout, typography, palette and copy angle) but all faithful to the request.

LAYOUTS (each concept must use a different one):
${LAYOUT_META.map((l) => `- ${l.id}: ${l.fits}`).join("\n")}

TYPOGRAPHY presets:
${TYPE_IDS.map((t) => `- ${t}: ${TYPE_PRESETS[t].fits}`).join("\n")}

DECOR options (pick 0-3 that suit the mood; less is more): disc (solid circle behind subject), rings, rays (sunburst), sparkles, blobs, dots, stripes, grid, confetti, waves, frame.
BADGE shapes for the highlight: circle, burst (loud sale), stamp (crafty/premium), tag (price tag), none.
BACKGROUND: ai_scene (AI photo backdrop; best for food, lifestyle, events, premium), gradient (clean, fast), solid (minimal).

COLOURS: invent a harmonious palette per concept that fits the subject, brand mood and any colours the user mentions (6-digit hex). Ensure text is readable on bg (contrast >= 4.5) and onPrimary is readable on primary. Avoid three saturated colours fighting each other.

COPY RULES:
- ${langRule} Latin alphabet only, no emoji.
- headline max 6 words, punchy; each concept uses a different angle (urgency, benefit, emotion/taste, curiosity).
- NEVER invent prices, discounts, dates, addresses, phone numbers or brand names that are not in the request. If there is no offer, leave highlight empty or use a neutral word like "NEW" / "BARU" only when it fits.
- Keep facts (numbers, names, dates) exactly as written by the user.

SUBJECT:
- ${hasPhoto ? "The user uploaded a photo of the subject; it will be cut out with remove.bg and placed as the hero. Set showSubject=true." : "No photo was uploaded. If the poster is about a tangible thing (product, dish, drink, pet, object), set showSubject=true and write subjectPrompt: an English description of the subject ALONE as a studio product shot (e.g. 'a glass of iced palm sugar milk coffee with ice cubes'). For events/announcements/hiring without a clear object, set showSubject=false."}
- subjectType: product | food | person | animal | object | none.

bgPrompt (English, max 40 words): describe ONLY the backdrop/scene, matching the palette. When there is a subject, describe a backdrop or surface it can stand on (e.g. 'soft beige studio backdrop with a travertine podium, warm morning light, palm leaf shadows') and keep the centre empty. No text, no people, no logos, no products in it.

Return only JSON that matches the schema.`;
}

// ---------- sanitising LLM output
const FALLBACK = { bg: "#FBF8F3", surface: "#FFFFFF", text: "#1A1A1A", primary: "#F4A6BF", onPrimary: "#1A1A1A", accent: "#BFE3EE" };

function sanitizeSpec(raw: z.infer<typeof SpecSchema>, i: number, usedLayouts: Set<string>): DesignSpec {
  const col = Object.fromEntries(Object.entries(FALLBACK).map(([k, v]) => {
    const x = (raw.colors as Record<string, string>)[k];
    return [k, isHex(x) ? x.trim().toUpperCase() : v];
  })) as DesignSpec["colors"];
  col.text = readable(col.text, col.bg);
  col.onPrimary = readable(col.onPrimary, col.primary);
  if (col.surface.toUpperCase() === col.bg.toUpperCase()) col.surface = mix(col.bg, "#FFFFFF", 0.7);

  let layout = raw.layout;
  if (usedLayouts.has(layout)) layout = LAYOUT_IDS.find((l) => !usedLayouts.has(l)) ?? layout;
  usedLayouts.add(layout);

  const t = raw.text;
  const cut = (s: string, n: number) => cleanText(s).slice(0, n);
  return {
    name: cut(raw.name, 40) || `Konsep ${i + 1}`,
    alasan: cut(raw.alasan, 220),
    layout,
    align: raw.align,
    typography: raw.typography,
    headingCase: raw.headingCase,
    colors: col,
    background: raw.background,
    bgPrompt: cut(raw.bgPrompt, 400),
    decor: [...new Set(raw.decor)].slice(0, 3),
    badgeShape: raw.badgeShape,
    productSize: raw.productSize,
    text: {
      eyebrow: cut(t.eyebrow, 32),
      headline: cut(t.headline, 60) || "Promo spesial",
      emphasis: cut(t.emphasis, 30),
      subheadline: cut(t.subheadline, 120),
      highlight: cut(t.highlight, 14),
      highlightLabel: cut(t.highlightLabel, 14),
      details: t.details.map((d) => cut(d, 48)).filter(Boolean).slice(0, 3),
      cta: cut(t.cta, 26),
      footer: cut(t.footer, 32),
    },
    seed: Math.floor(Math.random() * 900000) + 1,
  };
}

export async function generateBrief(i: PromptPosterInput): Promise<Brief & { specs: DesignSpec[] }> {
  const count = Math.min(4, Math.max(1, i.count));
  let object: Brief | null = null;
  let lastError: unknown = null;
  // Try the preferred provider first (Gemini by default), fall back to the next one on any error
  for (const pv of designerProviders()) {
    try {
      const r = await withRetry(() =>
        generateObject({
          model: pv.model,
          mode: "json",
          schema: BriefSchema,
          temperature: 0.85,
          maxRetries: 1,
          providerOptions: pv.providerOptions as never,
          system: systemPrompt(count, i.lang, Boolean(i.photo)),
          prompt: `Poster ratio: ${i.ratio}.\nUser request:\n"""${i.prompt}"""`,
        }), 1, 1200);
      object = r.object;
      break;
    } catch (e) {
      console.error(`[prompt-poster:brief] ${pv.label} failed:`, e);
      lastError = e;
    }
  }
  if (!object) throw lastError ?? new Error("Brief gagal dibuat");
  const used = new Set<string>();
  const specs = object.concepts.slice(0, count).map((c, k) => sanitizeSpec(c, k, used));
  if (i.bgMode === "solid") specs.forEach((s) => { if (s.background === "ai_scene") s.background = "gradient"; });
  return { ...object, specs };
}

// ---------- Pollinations image generation
async function pollinations(prompt: string, w: number, h: number, seed: number, timeoutMs = 45_000): Promise<Buffer | null> {
  const params = new URLSearchParams({ width: String(w), height: String(h), nologo: "true", seed: String(seed), model: "flux", enhance: "false" });
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;
  const token = process.env.POLLINATIONS_TOKEN?.trim();
  try {
    return await withRetry(async () => {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) throw new Error(`pollinations ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5_000) throw new Error("pollinations empty image");
      return buf;
    }, 1, 1500);
  } catch (e) {
    console.error("[prompt-poster:pollinations]", e);
    return null;
  }
}

export async function fetchSceneBackground(spec: DesignSpec, ratio: Ratio, hasSubject: boolean): Promise<Buffer | null> {
  if (spec.background !== "ai_scene" || !spec.bgPrompt) return null;
  const { w, h } = SIZES[ratio];
  const pw = 832, ph = Math.round((pw * h) / w / 16) * 16;
  const subjectHint = hasSubject ? ", empty space in the centre for a product, product photography backdrop" : ", wide negative space for typography";
  const prompt = `${spec.bgPrompt}${subjectHint}, no text, no letters, no logo, no watermark, no people, high quality, soft depth of field, editorial photography`;
  return pollinations(prompt, pw, ph, spec.seed);
}

// ---------- subject preparation (remove.bg)
const rbType = (t: Brief["subjectType"]): RemoveBgType => (t === "person" ? "person" : t === "animal" ? "animal" : t === "none" ? "auto" : "product");

async function shrinkCutout(png: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(png).trim({ threshold: 4 }).resize(1300, 1300, { fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer().catch(() => png);
}

export async function prepareSubject(i: PromptPosterInput, brief: Brief, emit: (e: PromptPosterEvent) => void): Promise<{ asset: ProductAsset; source: "upload" | "ai" | "none"; notes: string[] }> {
  const notes: string[] = [];
  if (i.photo) {
    emit({ type: "status", message: "Menghapus background foto dengan remove.bg..." });
    const photo = await normalizePhoto(i.photo);
    const r = await removeBackgroundDetailed(photo, rbType(brief.subjectType));
    if (r.cutout) {
      if (r.preview) notes.push("Kredit remove.bg habis, dipakai mode preview gratis (masker diperbesar ke resolusi asli).");
      return { asset: { cutout: await shrinkCutout(r.cutout), photo }, source: "upload", notes };
    }
    notes.push(`${r.error ?? "Remove.bg gagal."} Foto dipasang sebagai kartu.`);
    return { asset: { cutout: null, photo }, source: "upload", notes };
  }

  if (!i.aiSubject || !brief.showSubject || !brief.subjectPrompt) return { asset: { cutout: null, photo: null }, source: "none", notes };

  emit({ type: "status", message: "Membuat foto produk dengan AI..." });
  const prompt = `${brief.subjectPrompt}, professional studio product photography, single subject centred, entire subject visible with margin, isolated on a pure white seamless background, soft even studio lighting, sharp focus, highly detailed, photorealistic, no text, no logo, no hands`;
  const img = await pollinations(prompt, 1024, 1024, Math.floor(Math.random() * 900000) + 1, 60_000);
  if (!img) { notes.push("Foto produk AI gagal dibuat, poster dibuat tanpa foto produk."); return { asset: { cutout: null, photo: null }, source: "none", notes }; }

  emit({ type: "status", message: "Memotong produk dengan remove.bg..." });
  const jpg = await normalizePhoto(img);
  const r = await removeBackgroundDetailed(jpg, rbType(brief.subjectType));
  if (r.cutout) return { asset: { cutout: await shrinkCutout(r.cutout), photo: null }, source: "ai", notes };

  // remove.bg unavailable -> local white-backdrop removal works because we asked for a white backdrop
  const local = await removeWhiteBackground(jpg);
  notes.push(`${r.error ?? "Remove.bg gagal."} ${local ? "Dipakai penghapus latar putih bawaan." : "Foto produk dipasang sebagai kartu."}`);
  return local ? { asset: { cutout: await shrinkCutout(local), photo: null }, source: "ai", notes } : { asset: { cutout: null, photo: jpg }, source: "ai", notes };
}

// ---------- render one design
export async function renderPromptPoster(spec: DesignSpec, ratio: Ratio, asset: ProductAsset): Promise<{ url: string; bgFallback: boolean }> {
  const hasSubject = Boolean(asset.cutout || asset.photo);
  const bg = await fetchSceneBackground(spec, ratio, hasSubject);
  const bgFallback = spec.background === "ai_scene" && !bg;
  const effective: DesignSpec = bgFallback ? { ...spec, background: "gradient" } : spec;
  const jpg = await renderDesign({ spec: effective, ratio, product: asset, background: bg });
  return { url: `data:image/jpeg;base64,${jpg.toString("base64")}`, bgFallback };
}

// ---------- full pipeline (streamed)
export async function runPromptPosters(i: PromptPosterInput, emit: (e: PromptPosterEvent) => void) {
  emit({ type: "status", message: "AI membaca permintaanmu dan merancang konsep..." });
  const brief = await generateBrief(i);
  const subject = await prepareSubject(i, brief, emit);
  const notes = [...subject.notes];
  if (i.lang !== "auto" && !LATIN.includes(i.lang)) notes.push("Font poster hanya huruf Latin, jadi teks ditulis dalam bahasa Inggris.");

  emit({
    type: "brief",
    kind: brief.kind,
    subject: brief.subject,
    specs: brief.specs,
    cutout: subject.asset.cutout ? `data:image/png;base64,${subject.asset.cutout.toString("base64")}` : null,
    subjectSource: subject.source,
    notes,
  });
  emit({ type: "status", message: "Merender poster..." });

  await Promise.all(brief.specs.map(async (spec, index) => {
    try {
      const r = await renderPromptPoster(spec, i.ratio, subject.asset);
      emit({ type: "poster", index, url: r.url, bgFallback: r.bgFallback });
    } catch (e) {
      console.error("[prompt-poster:render]", e);
      emit({ type: "poster", index, url: null, error: e instanceof Error ? e.message : "Render gagal" });
    }
  }));
}

// Validate a (possibly user-edited) spec coming back from the browser
export function parseClientSpec(raw: unknown): DesignSpec {
  const parsed = SpecSchema.extend({ seed: z.number().int().positive().catch(1) }).parse(raw);
  const spec = sanitizeSpec(parsed, 0, new Set());
  return { ...spec, layout: parsed.layout, seed: parsed.seed };
}
