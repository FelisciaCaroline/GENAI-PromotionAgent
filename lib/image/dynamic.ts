import sharp from "sharp";
import { bestOn, contrast, hexToRgb, isDark, luminance, mix, readable, rgba, rgbToHex, type RGB } from "./color";
import { SIZES, type Ratio } from "./compose";
import { TYPE_PRESETS, type DecorId, type DesignSpec, type FontRef, type TypePreset } from "./design-catalog";
import { measure, wrap } from "./fonts";
import { placeCard, placeCutout, type Box } from "./product";
import { el, renderLayer, type Node } from "./satori";

// ======================================================================
// Prompt-driven poster renderer: turns a DesignSpec (from the LLM) into a
// finished JPEG. Layout zones are computed here so text never overlaps the
// subject, and font sizes are fitted with real glyph metrics.
// ======================================================================

export type ProductAsset = { cutout: Buffer | null; photo: Buffer | null };

type Align = "left" | "center";
type VAlign = "top" | "center" | "bottom";
type Part = "eyebrow" | "headline" | "sub" | "highlight" | "details" | "cta" | "footer";

type Zone = { box: Box; align: Align; v: VAlign; parts: Part[]; maxLines: number; giant?: boolean; detailsInline?: boolean };
type Panel = { box: Box; fill: string; radius: number };
type Layout = {
  head: Zone;
  foot: Zone | null;
  product: Box | null;
  anchor: "bottom" | "center";
  badge: { cx: number; cy: number; d: number } | null;
  panels: Panel[];
  headUnder: boolean;
  frame: boolean;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const B = (x: number, y: number, w: number, h: number): Box => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });

// Strip characters the bundled Latin fonts cannot draw (emoji, CJK, etc.)
export function cleanText(s: string): string {
  return (s ?? "").replace(/[^ -~ -ſ‐-‧‰-⁞€]/g, "").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------- layout
function computeLayout(spec: DesignSpec, W: number, H: number, ratio: Ratio, hasProduct: boolean): Layout {
  const m = Math.round(W * 0.065);
  const c = spec.colors;
  let id = spec.layout;
  if (ratio === "9:16" && (id === "split_left" || id === "split_right")) id = "stack_center";
  const align: Align = spec.align;
  const headParts: Part[] = ["eyebrow", "headline", "sub"];
  const footParts: Part[] = ["highlight", "details", "cta", "footer"];
  const base = { panels: [] as Panel[], headUnder: false, frame: false, anchor: "bottom" as const };

  switch (id) {
    case "split_left":
    case "split_right": {
      const left = id === "split_left";
      const tw = W * 0.5 - m;
      const tx = left ? m : W * 0.5;
      const px = left ? W * 0.5 : W * 0.02;
      if (!hasProduct) {
        return { ...base, head: { box: B(m, H * 0.1, W - 2 * m, H * 0.56), align: "left", v: "bottom", parts: headParts, maxLines: 3 }, foot: { box: B(m, H * 0.69, W - 2 * m, H * 0.25), align: "left", v: "top", parts: footParts, maxLines: 1 }, product: null, badge: null };
      }
      const product = B(px, H * 0.1, W * 0.48, H * 0.82);
      return {
        ...base,
        head: { box: B(tx, H * 0.08, tw, H * 0.5), align: "left", v: "bottom", parts: headParts, maxLines: 4 },
        foot: { box: B(tx, H * 0.61, tw, H * 0.32), align: "left", v: "top", parts: footParts, maxLines: 1 },
        product,
        badge: { cx: product.x + product.w * (left ? 0.8 : 0.2), cy: product.y + product.h * 0.1, d: W * 0.22 },
      };
    }
    case "stack_bottom": {
      if (!hasProduct) {
        return { ...base, head: { box: B(m, H * 0.36, W - 2 * m, H * 0.44), align, v: "bottom", parts: headParts, maxLines: 3 }, foot: { box: B(m, H * 0.82, W - 2 * m, H * 0.14), align, v: "center", parts: footParts, maxLines: 1, detailsInline: true }, product: null, badge: null };
      }
      const product = B(W * 0.1, H * 0.05, W * 0.8, H * 0.5);
      return {
        ...base,
        head: { box: B(m, H * 0.585, W - 2 * m, H * 0.235), align, v: "top", parts: headParts, maxLines: 2 },
        foot: { box: B(m, H * 0.83, W - 2 * m, H * 0.135), align, v: "center", parts: footParts, maxLines: 1, detailsInline: true },
        product,
        badge: { cx: product.x + product.w * 0.86, cy: product.y + product.h * 0.2, d: W * 0.23 },
      };
    }
    case "magazine": {
      if (!hasProduct) {
        return { ...base, head: { box: B(m, H * 0.08, W - 2 * m, H * 0.62), align: "center", v: "center", parts: headParts, maxLines: 3, giant: true }, foot: { box: B(m, H * 0.74, W - 2 * m, H * 0.21), align: "center", v: "center", parts: footParts, maxLines: 1, detailsInline: true }, product: null, badge: null };
      }
      const product = B(W * 0.1, H * 0.27, W * 0.8, H * 0.575);
      return {
        ...base,
        headUnder: true,
        head: { box: B(m * 0.6, H * 0.04, W - 1.2 * m, H * 0.32), align: "center", v: "top", parts: ["eyebrow", "headline"], maxLines: 2, giant: true },
        foot: { box: B(m, H * 0.855, W - 2 * m, H * 0.125), align: "center", v: "center", parts: ["sub", "details", "cta"], maxLines: 1, detailsInline: true },
        product,
        badge: { cx: W * 0.83, cy: H * 0.56, d: W * 0.22 },
      };
    }
    case "bold_band": {
      if (!hasProduct) {
        const band: Panel = { box: B(0, H * 0.6, W, H * 0.4), fill: c.primary, radius: 0 };
        return { ...base, panels: [band], head: { box: B(m, H * 0.08, W - 2 * m, H * 0.47), align, v: "center", parts: headParts, maxLines: 3 }, foot: { box: B(m, H * 0.64, W - 2 * m, H * 0.32), align, v: "center", parts: footParts, maxLines: 1, detailsInline: true }, product: null, badge: null };
      }
      const band: Panel = { box: B(0, H * 0.62, W, H * 0.38), fill: c.primary, radius: 0 };
      const product = B(W * 0.14, H * 0.06, W * 0.72, H * 0.645);
      return {
        ...base,
        panels: [band],
        head: { box: B(m, H * 0.725, W - 2 * m, H * 0.245), align, v: "center", parts: ["headline", "sub", "details", "cta"], maxLines: 2, detailsInline: true },
        foot: { box: B(m, H * 0.04, W * 0.6, H * 0.08), align: "left", v: "top", parts: ["eyebrow"], maxLines: 1 },
        product,
        badge: { cx: W * 0.82, cy: H * 0.2, d: W * 0.24 },
      };
    }
    case "frame_card": {
      const g = Math.round(W * 0.05);
      if (!hasProduct) {
        const panel: Panel = { box: B(g, H * 0.18, W - 2 * g, H * 0.64), fill: c.surface, radius: 34 };
        return { ...base, frame: true, panels: [panel], head: { box: B(g + m, H * 0.22, W - 2 * g - 2 * m, H * 0.36), align, v: "center", parts: headParts, maxLines: 3 }, foot: { box: B(g + m, H * 0.6, W - 2 * g - 2 * m, H * 0.19), align, v: "center", parts: footParts, maxLines: 1, detailsInline: true }, product: null, badge: null };
      }
      const panel: Panel = { box: B(g, H * 0.585, W - 2 * g, H * 0.415 - g), fill: c.surface, radius: 34 };
      const product = B(W * 0.13, H * 0.05, W * 0.74, H * 0.565);
      const inner = { x: panel.box.x + m * 0.8, w: panel.box.w - m * 1.6 };
      return {
        ...base,
        frame: true,
        panels: [panel],
        head: { box: B(inner.x, panel.box.y + H * 0.045, inner.w, panel.box.h * 0.55), align, v: "center", parts: headParts, maxLines: 2 },
        foot: { box: B(inner.x, panel.box.y + H * 0.045 + panel.box.h * 0.56, inner.w, panel.box.h * 0.3), align, v: "center", parts: footParts, maxLines: 1, detailsInline: true },
        product,
        badge: { cx: product.x + product.w * 0.88, cy: product.y + product.h * 0.16, d: W * 0.22 },
      };
    }
    case "stack_center":
    default: {
      if (!hasProduct) {
        return { ...base, head: { box: B(m, H * 0.1, W - 2 * m, H * 0.6), align, v: "center", parts: headParts, maxLines: 3 }, foot: { box: B(m, H * 0.72, W - 2 * m, H * 0.23), align, v: "center", parts: footParts, maxLines: 1, detailsInline: true }, product: null, badge: null };
      }
      const head = B(m, H * 0.05, W - 2 * m, H * 0.255);
      const product = B(W * 0.12, head.y + head.h + H * 0.01, W * 0.76, H * 0.8 - (head.y + head.h + H * 0.01));
      return {
        ...base,
        head: { box: head, align, v: "center", parts: headParts, maxLines: 2 },
        foot: { box: B(m, H * 0.82, W - 2 * m, H * 0.15), align, v: "center", parts: footParts, maxLines: 1, detailsInline: true },
        product,
        badge: { cx: product.x + product.w * 0.88, cy: product.y + product.h * 0.16, d: W * 0.24 },
      };
    }
  }
}

// ---------------------------------------------------------------- backgrounds
function rng(seed: number) {
  let s = (seed % 2147483647) || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

async function paintBackground(spec: DesignSpec, W: number, H: number, photo: Buffer | null): Promise<{ img: Buffer; isPhoto: boolean }> {
  if (photo) {
    const img = await sharp(photo).resize(W, H, { fit: "cover", position: "attention" }).modulate({ saturation: 1.05 }).png().toBuffer();
    return { img, isPhoto: true };
  }
  const c = spec.colors;
  const r = rng(spec.seed);
  if (spec.background === "solid") {
    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="v" cx="50%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${isDark(c.bg) ? 0.35 : 0.08}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="${c.bg}"/><rect width="${W}" height="${H}" fill="url(#v)"/></svg>`;
    return { img: await sharp(Buffer.from(svg)).png().toBuffer(), isPhoto: false };
  }
  const end = mix(c.bg, c.primary, 0.35);
  const glow = { x: Math.round(W * (0.25 + r() * 0.5)), y: Math.round(H * (0.25 + r() * 0.4)) };
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs>
<linearGradient id="g" x1="0" y1="0" x2="${(0.3 + r() * 0.7).toFixed(2)}" y2="1"><stop offset="0" stop-color="${c.bg}"/><stop offset="1" stop-color="${end}"/></linearGradient>
<radialGradient id="r" cx="${glow.x}" cy="${glow.y}" r="${Math.round(W * 0.6)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c.accent}" stop-opacity="0.45"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0"/></radialGradient>
</defs><rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#r)"/></svg>`;
  return { img: await sharp(Buffer.from(svg)).png().toBuffer(), isPhoto: false };
}

async function regionStats(img: Buffer, box: Box, W: number, H: number): Promise<{ mean: RGB; sd: number }> {
  const left = clamp(box.x, 0, W - 2), top = clamp(box.y, 0, H - 2);
  const width = clamp(box.w, 1, W - left), height = clamp(box.h, 1, H - top);
  // stats() ignores pipeline ops, so materialise the crop first
  const crop = await sharp(img).extract({ left, top, width, height }).removeAlpha().png().toBuffer();
  const s = await sharp(crop).stats();
  const ch = s.channels.slice(0, 3);
  return { mean: [ch[0].mean, ch[1].mean, ch[2].mean], sd: (ch[0].stdev + ch[1].stdev + ch[2].stdev) / 3 };
}

// ---------------------------------------------------------------- colours per zone
type Ink = { text: string; soft: string; emph: string; markerBg: string; markerText: string; scrim: { color: string; alpha: number } | null };

// strips: per-strip mean colours of the zone; text must work on the worst one
const minContrast = (fg: string, strips: RGB[]) => Math.min(...strips.map((s) => contrast(fg, s)));

function inkFor(spec: DesignSpec, bg: RGB, busy: number, isPhoto: boolean, onPanel: boolean, strips: RGB[] = [bg]): Ink {
  const c = spec.colors;
  let scrim: Ink["scrim"] = null;
  let eff: RGB = bg;
  const best = [c.text, c.surface, "#FFFFFF", "#111111"].reduce((a, x) => (minContrast(x, strips) > minContrast(a, strips) ? x : a), c.text);
  if (isPhoto && !onPanel && minContrast(c.text, strips) >= 4.5 && busy <= 38) {
    // palette text colour already works everywhere in the zone
  } else if (isPhoto && !onPanel && minContrast(best, strips) >= 4.5 && busy <= 30) {
    const text = best;
    const emph = minContrast(c.primary, strips) >= 3 ? c.primary : minContrast(c.accent, strips) >= 3 ? c.accent : text;
    const markerBg = contrast(c.primary, bg) >= 1.4 ? c.primary : c.accent;
    return { text, soft: rgba(text, 0.9), emph, markerBg, markerText: readable(c.onPrimary, markerBg), scrim: null };
  } else if (isPhoto && !onPanel) {
    const darkScrim = luminance(bg) < 0.4;
    const color = darkScrim ? mix(isDark(c.bg) ? c.bg : "#0B0B10", "#000000", 0.4) : (luminance(c.surface) > 0.7 ? c.surface : "#FFFFFF");
    const alpha = busy > 55 ? 0.68 : busy > 38 ? 0.56 : 0.45;
    scrim = { color, alpha };
    const sc = hexToRgb(color);
    eff = [bg[0] + (sc[0] - bg[0]) * alpha, bg[1] + (sc[1] - bg[1]) * alpha, bg[2] + (sc[2] - bg[2]) * alpha];
  }
  const text = readable(contrast(c.text, eff) >= 4.5 ? c.text : bestOn(eff, [c.text, c.surface, "#FFFFFF", "#111111"]), eff);
  const emph = contrast(c.primary, eff) >= 3 ? c.primary : contrast(c.accent, eff) >= 3 ? c.accent : text;
  const markerBg = contrast(c.primary, eff) >= 1.4 ? c.primary : c.accent;
  const markerText = readable(c.onPrimary, markerBg);
  return { text, soft: rgba(text, 0.86), emph, markerBg, markerText, scrim };
}

// ---------------------------------------------------------------- text fitting
type Word = { w: string; emph: boolean };
type Line = Word[];

function applyCase(s: string, mode: DesignSpec["headingCase"], force?: boolean): string {
  if (force || mode === "upper") return s.toUpperCase();
  if (mode === "lower") return s.toLowerCase();
  if (mode === "title") return s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase());
  return s;
}

function headlineWords(spec: DesignSpec, p: TypePreset): Word[] {
  const text = applyCase(cleanText(spec.text.headline), spec.headingCase, p.heading.forceUpper);
  const ws = text.split(/\s+/).filter(Boolean);
  const em = cleanText(spec.text.emphasis).toLowerCase().split(/\s+/).filter(Boolean);
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, "");
  let start = -1;
  if (em.length) {
    for (let i = 0; i + em.length <= ws.length && start < 0; i++) {
      if (em.every((e, j) => norm(ws[i + j]) === norm(e))) start = i;
    }
  }
  return ws.map((w, i) => ({ w, emph: start >= 0 && i >= start && i < start + em.length }));
}

function wordFont(p: TypePreset, emph: boolean): { font: FontRef; scale: number } {
  if (emph && p.emphasis) return { font: p.emphasis, scale: p.emphasis.family === "Pacifico" ? 0.82 : 1 };
  return { font: p.heading, scale: 1 };
}

function wordWidth(p: TypePreset, wd: Word, size: number): number {
  const { font, scale } = wordFont(p, wd.emph);
  const tr = wd.emph && p.emphasis ? 0 : p.heading.tracking;
  const pad = wd.emph && p.emphasisStyle === "marker" ? size * 0.24 : 0;
  return measure(font, wd.w, size * scale, tr) + pad;
}

function wrapWords(p: TypePreset, words: Word[], size: number, maxW: number): Line[] {
  const space = Math.max(measure(p.heading, " ", size), size * 0.2);
  const lines: Line[] = [];
  let cur: Line = [];
  let curW = 0;
  for (const wd of words) {
    const ww = wordWidth(p, wd, size);
    if (cur.length && curW + space + ww > maxW) { lines.push(cur); cur = [wd]; curW = ww; }
    else { curW += (cur.length ? space : 0) + ww; cur.push(wd); }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

const fits = (p: TypePreset, lines: Line[], size: number, maxW: number) => {
  const space = Math.max(measure(p.heading, " ", size), size * 0.2);
  return lines.every((l) => l.reduce((a, wd, i) => a + wordWidth(p, wd, size) + (i ? space : 0), 0) <= maxW);
};

function truncateToWidth(font: FontRef, s: string, size: number, maxW: number, tracking = 0): string {
  if (measure(font, s, size, tracking) <= maxW) return s;
  let t = s;
  while (t.length > 1 && measure(font, t + "…", size, tracking) > maxW) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

type Built = { node: Node; h: number };

function ctaFont(p: TypePreset): FontRef & { tracking: number; upper: boolean } {
  if (p.accent.family === "Pacifico") return { family: "Poppins", weight: 600, tracking: 0.04, upper: false };
  return { family: p.accent.family, weight: p.accent.weight, tracking: Math.min(p.accent.tracking, 0.12), upper: p.accent.upper };
}

function eyebrowFont(p: TypePreset) {
  return p.accent;
}

type BlockCtx = { spec: DesignSpec; p: TypePreset; ink: Ink; zone: Zone; c: DesignSpec["colors"] };

function buildParts(ctx: BlockCtx, hs: number, finalPass: boolean): { items: Built[]; total: number; ok: boolean } {
  const { spec, p, ink, zone } = ctx;
  const t = spec.text;
  const W = zone.box.w;
  const jc = zone.align === "center" ? "center" : "flex-start";
  const items: Built[] = [];
  let ok = true;
  const scale = clamp(hs / 120, 0.72, 1.15);

  for (const part of zone.parts) {
    if (part === "eyebrow" && cleanText(t.eyebrow)) {
      const f = eyebrowFont(p);
      const script = f.family === "Pacifico";
      const size = Math.round((script ? 36 : 24) * clamp(scale, 0.85, 1.1));
      const chip = !script && (p.emphasisStyle === "marker" || p.cta === "outline");
      const raw = f.upper ? cleanText(t.eyebrow).toUpperCase() : cleanText(t.eyebrow);
      const txt = truncateToWidth(f, raw, size, W - (chip ? 32 : 0), f.tracking);
      const h = Math.round(size * (script ? 1.5 : 1.25) + (chip ? 14 : 0));
      const style: Record<string, string | number> = chip
        ? { padding: "7px 16px", backgroundColor: ctx.c.accent, color: readable(ctx.c.text, ctx.c.accent), borderRadius: 6 }
        : { color: ink.emph };
      items.push({ h, node: el("div", { flexDirection: "row", height: h, alignItems: "center", justifyContent: jc, width: W },
        el("div", { fontFamily: f.family, fontWeight: f.weight, fontSize: size, letterSpacing: f.tracking * size, lineHeight: 1, ...style }, txt)) });
    }

    if (part === "headline" && cleanText(t.headline)) {
      const words = headlineWords(spec, p);
      const lines = wrapWords(p, words, hs, W);
      if (lines.length > zone.maxLines || !fits(p, lines, hs, W)) ok = false;
      const lh = Math.round(hs * p.heading.lineHeight * (p.emphasisStyle === "marker" ? 1.1 : 1));
      const rows = lines.map((line) => el("div", { flexDirection: "row", justifyContent: jc, alignItems: "center", height: lh, width: W },
        ...line.map((wd, i) => {
          const { font, scale: s } = wordFont(p, wd.emph);
          const space = Math.max(measure(p.heading, " ", hs), hs * 0.2);
          const marker = wd.emph && p.emphasisStyle === "marker";
          const under = wd.emph && p.emphasisStyle === "underline";
          return el("div", {
            fontFamily: font.family, fontWeight: font.weight, fontStyle: font.style ?? "normal", fontSize: Math.round(hs * s), lineHeight: 1,
            letterSpacing: wd.emph && p.emphasis ? 0 : p.heading.tracking * hs, marginLeft: i ? space : 0,
            color: marker ? ink.markerText : wd.emph ? ink.emph : ink.text,
            ...(marker ? { backgroundColor: ink.markerBg, padding: `${Math.round(hs * 0.04)}px ${Math.round(hs * 0.12)}px`, transform: "rotate(-1.5deg)" } : {}),
            ...(under ? { borderBottom: `${Math.max(4, Math.round(hs * 0.06))}px solid ${ink.emph}` } : {}),
          }, wd.w);
        })));
      const h = lh * lines.length;
      const mt = items.length ? Math.round(hs * 0.16) : 0;
      items.push({ h: h + mt, node: el("div", { width: W, height: h, marginTop: mt }, ...rows) });
    }

    if (part === "sub" && cleanText(t.subheadline)) {
      const f = p.body;
      let size = clamp(Math.round(hs * 0.3), 26, 42);
      if (zone.parts[0] === "sub") size = clamp(Math.round(30 * Math.min(1, W / 800)), 24, 32); // footer-style sub
      let lines = wrap(f, cleanText(t.subheadline), size, W);
      while (lines.length > 3 && size > 22) { size -= 2; lines = wrap(f, cleanText(t.subheadline), size, W); }
      if (lines.length > 3) { lines = lines.slice(0, 3); lines[2] = truncateToWidth(f, lines[2] + "…", size, W); if (!finalPass) ok = false; }
      const lh = Math.round(size * 1.3);
      const h = lh * lines.length;
      const mt = items.length ? Math.round(size * 0.7) : 0;
      items.push({ h: h + mt, node: el("div", { width: W, height: h, marginTop: mt },
        ...lines.map((l) => el("div", { flexDirection: "row", justifyContent: jc, height: lh, alignItems: "center", fontFamily: f.family, fontWeight: f.weight, fontSize: size, color: ink.soft, lineHeight: 1 }, l))) });
    }

    if (part === "highlight" && cleanText(t.highlight)) {
      const f: FontRef = p.heading;
      let size = clamp(Math.round(hs * 0.85), 56, 132);
      const txt = applyCase(cleanText(t.highlight), "normal", p.heading.forceUpper);
      while (size > 40 && measure(f, txt, size, p.heading.tracking) > W) size -= 4;
      const label = cleanText(t.highlightLabel);
      const ls = Math.round(size * 0.24);
      const lh = Math.round(size * 1.02);
      const h = lh + (label ? Math.round(ls * 1.5) : 0);
      const mt = items.length ? 22 : 0;
      items.push({ h: h + mt, node: el("div", { width: W, height: h, marginTop: mt, alignItems: zone.align === "center" ? "center" : "flex-start" },
        label ? el("div", { fontFamily: p.accent.family === "Pacifico" ? "Poppins" : p.accent.family, fontWeight: p.accent.family === "Pacifico" ? 600 : p.accent.weight, fontSize: ls, letterSpacing: ls * 0.12, color: ink.soft, height: Math.round(ls * 1.5), textTransform: "uppercase" }, label) : null,
        el("div", { fontFamily: f.family, fontWeight: f.weight, fontSize: size, lineHeight: 1, height: lh, color: ink.emph, letterSpacing: p.heading.tracking * size }, truncateToWidth(f, txt, size, W, p.heading.tracking))) });
    }

    if (part === "details") {
      const ds = (t.details ?? []).map(cleanText).filter(Boolean).slice(0, 3);
      if (ds.length) {
        const f = p.body;
        let size = 27;
        const mt = items.length ? 22 : 0;
        if (zone.detailsInline) {
          const joined = ds.join("   •   ");
          while (size > 20 && measure(f, joined, size) > W) size -= 1;
          const txt = truncateToWidth(f, joined, size, W);
          const h = Math.round(size * 1.4);
          items.push({ h: h + mt, node: el("div", { flexDirection: "row", width: W, height: h, marginTop: mt, justifyContent: jc, alignItems: "center", fontFamily: f.family, fontWeight: f.weight === 400 && f.family === "Poppins" ? 600 : f.weight, fontSize: size, color: ink.text, lineHeight: 1 }, txt) });
        } else {
          const lh = Math.round(size * 1.55);
          const rows = ds.map((d) => el("div", { flexDirection: "row", alignItems: "center", height: lh, justifyContent: jc },
            el("div", { width: 12, height: 12, borderRadius: 99, backgroundColor: ink.emph, marginRight: 14 }),
            el("div", { fontFamily: f.family, fontWeight: f.weight, fontSize: size, color: ink.text, lineHeight: 1 }, truncateToWidth(f, d, size, W - 26))));
          items.push({ h: lh * ds.length + mt, node: el("div", { width: W, marginTop: mt, height: lh * ds.length }, ...rows) });
        }
      }
    }

    if (part === "cta" && cleanText(t.cta)) {
      const f = ctaFont(p);
      const size = Math.round(clamp(30 * Math.min(1, scale + 0.1), 24, 32));
      const txt = f.upper ? cleanText(t.cta).toUpperCase() : cleanText(t.cta);
      const mt = items.length ? 28 : 0;
      let node: Node;
      let h: number;
      const base = { fontFamily: f.family, fontWeight: f.weight, fontSize: size, letterSpacing: f.tracking * size, lineHeight: 1 };
      if (p.cta === "pill") {
        const bg = contrast(ctx.c.primary, hexToRgb(ink.text)) < 1.3 ? ink.text : ctx.c.primary;
        const fg = readable(ctx.c.onPrimary, bg);
        h = size + 44;
        node = el("div", { ...base, flexDirection: "row", alignItems: "center", height: h, padding: `0 ${Math.round(size * 1.3)}px`, borderRadius: 999, backgroundColor: bg, color: fg, boxShadow: "0 8px 18px rgba(0,0,0,0.18)" }, truncateToWidth(f, txt, size, W - size * 2.6, f.tracking));
      } else if (p.cta === "outline") {
        h = size + 40;
        node = el("div", { ...base, flexDirection: "row", alignItems: "center", height: h, padding: `0 ${Math.round(size * 1.1)}px`, borderRadius: 999, border: `3px solid ${ink.text}`, color: ink.text }, truncateToWidth(f, txt, size, W - size * 2.4, f.tracking));
      } else {
        h = size + 22;
        node = el("div", { ...base, flexDirection: "row", alignItems: "center", height: h, borderBottom: `3px solid ${ink.emph}`, color: ink.text }, truncateToWidth(f, `${txt}  »`, size, W, f.tracking));
      }
      items.push({ h: h + mt, node: el("div", { flexDirection: "row", width: W, justifyContent: jc, marginTop: mt, height: h }, node) });
    }

    if (part === "footer" && cleanText(t.footer)) {
      const f = p.accent.family === "Pacifico" ? { family: "Poppins", weight: 600 as const } : p.accent;
      const size = 21;
      const mt = items.length ? 18 : 0;
      const h = Math.round(size * 1.4);
      items.push({ h: h + mt, node: el("div", { flexDirection: "row", width: W, height: h, marginTop: mt, justifyContent: jc, alignItems: "center", fontFamily: f.family, fontWeight: f.weight, fontSize: size, letterSpacing: size * 0.1, color: ink.soft, textTransform: "uppercase" }, truncateToWidth(f, cleanText(t.footer).toUpperCase(), size, W, 0.1)) });
    }
  }

  const total = items.reduce((a, b) => a + b.h, 0);
  return { items, total, ok };
}

function composeZone(ctx: BlockCtx): Node | null {
  const { zone, p } = ctx;
  if (!zone.parts.length) return null;
  const condensed = ["Anton", "Bebas Neue"].includes(p.heading.family);
  const hMax = Math.round(Math.min(zone.box.w * (zone.giant ? 0.3 : 0.19) * (condensed ? 1.35 : 1), zone.giant ? 300 : 220));
  const hMin = 40;
  const hasHeadline = zone.parts.includes("headline");
  let built = buildParts(ctx, hMax, false);
  if (hasHeadline || built.total > zone.box.h) {
    for (let hs = hMax; hs >= hMin; hs -= 3) {
      built = buildParts(ctx, hs, hs - 3 < hMin);
      if (built.ok && built.total <= zone.box.h) break;
    }
  }
  // still too tall: drop the least important parts one by one
  const dropOrder: Part[] = ["footer", "details", "eyebrow", "sub"];
  for (const d of dropOrder) {
    if (built.total <= zone.box.h) break;
    if (!ctx.zone.parts.includes(d)) continue;
    const z2 = { ...zone, parts: zone.parts.filter((x) => x !== d) };
    ctx = { ...ctx, zone: z2 };
    built = buildParts(ctx, hasHeadline ? hMin : hMax, true);
  }
  if (!built.items.length) return null;
  const jcV = zone.v === "top" ? "flex-start" : zone.v === "bottom" ? "flex-end" : "center";
  return el("div", {
    position: "absolute", left: zone.box.x, top: zone.box.y, width: zone.box.w, height: zone.box.h,
    justifyContent: jcV, alignItems: zone.align === "center" ? "center" : "flex-start",
  }, ...built.items.map((i) => i.node));
}

// ---------------------------------------------------------------- decor
function overlap(a: Box, b: Box) {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

function star(cx: number, cy: number, r: number, fill: string, op: number) {
  const i = r * 0.28;
  return `<path d="M${cx} ${cy - r} Q${cx + i} ${cy - i} ${cx + r} ${cy} Q${cx + i} ${cy + i} ${cx} ${cy + r} Q${cx - i} ${cy + i} ${cx - r} ${cy} Q${cx - i} ${cy - i} ${cx} ${cy - r}Z" fill="${fill}" opacity="${op}"/>`;
}

function decorSvg(spec: DesignSpec, L: Layout, W: number, H: number, isPhoto: boolean, scrims: { box: Box; color: string; alpha: number }[]): string {
  const c = spec.colors;
  const r = rng(spec.seed + 7);
  const parts: string[] = [];
  const defs: string[] = [];
  const textBoxes = [L.head.box, ...(L.foot ? [L.foot.box] : [])];
  const P = L.product;
  const pc = P ? { x: P.x + P.w / 2, y: P.y + P.h * 0.55, r: Math.min(P.w, P.h) * 0.46 } : { x: W / 2, y: H / 2, r: W * 0.35 };
  const onBg = isDark(c.bg) ? "#FFFFFF" : c.text;

  // scrims first so decor sits above them
  scrims.forEach((s, i) => {
    const cy = s.box.y + s.box.h / 2, cx = s.box.x + s.box.w / 2;
    const id = `s${i}`;
    if (s.box.w < W * 0.7 && (cx < W * 0.4 || cx > W * 0.6)) {
      const leftSide = cx < W / 2;
      const x2 = leftSide ? Math.min(W, s.box.x + s.box.w + W * 0.12) : Math.max(0, s.box.x - W * 0.12);
      defs.push(`<linearGradient id="${id}" x1="${leftSide ? 0 : W}" y1="0" x2="${x2}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${s.color}" stop-opacity="${s.alpha}"/><stop offset="0.7" stop-color="${s.color}" stop-opacity="${s.alpha * 0.8}"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`);
    } else if (cy < H * 0.42) {
      const y2 = Math.min(H, s.box.y + s.box.h + H * 0.1);
      defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="${y2}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${s.color}" stop-opacity="${s.alpha}"/><stop offset="0.72" stop-color="${s.color}" stop-opacity="${s.alpha * 0.85}"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`);
    } else if (cy > H * 0.58) {
      const y1 = Math.max(0, s.box.y - H * 0.12);
      defs.push(`<linearGradient id="${id}" x1="0" y1="${y1}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${s.color}" stop-opacity="0"/><stop offset="0.3" stop-color="${s.color}" stop-opacity="${s.alpha * 0.85}"/><stop offset="1" stop-color="${s.color}" stop-opacity="${s.alpha}"/></linearGradient>`);
    } else {
      defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${Math.max(s.box.w, s.box.h) * 0.75}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${s.color}" stop-opacity="${s.alpha}"/><stop offset="1" stop-color="${s.color}" stop-opacity="${s.alpha * 0.55}"/></radialGradient>`);
    }
    parts.push(`<rect width="${W}" height="${H}" fill="url(#${id})"/>`);
  });

  const allowedOnPhoto: DecorId[] = ["sparkles", "frame", "rings", "confetti", "waves"];
  const decor = spec.decor.filter((d) => !isPhoto || allowedOnPhoto.includes(d));
  const corners: Box[] = [B(0, 0, W * 0.34, H * 0.28), B(W * 0.66, 0, W * 0.34, H * 0.28), B(0, H * 0.72, W * 0.34, H * 0.28), B(W * 0.66, H * 0.72, W * 0.34, H * 0.28)];
  const freeCorners = corners.map((b) => ({ b, o: textBoxes.reduce((a, t) => a + overlap(b, t), 0) + (P ? overlap(b, P) * 0.3 : 0) })).sort((a, b) => a.o - b.o).map((x) => x.b);

  for (const d of decor) {
    if (d === "grid") {
      const step = Math.round(W / 20);
      let path = "";
      for (let x = step; x < W; x += step) path += `M${x} 0V${H}`;
      for (let y = step; y < H; y += step) path += `M0 ${y}H${W}`;
      parts.push(`<path d="${path}" stroke="${onBg}" stroke-opacity="0.07" stroke-width="1.5"/>`);
    }
    if (d === "blobs") {
      freeCorners.slice(0, 2).forEach((b, i) => {
        const cx = b.x < W / 2 ? b.x + b.w * 0.15 : b.x + b.w * 0.85;
        const cy = b.y < H / 2 ? b.y + b.h * 0.15 : b.y + b.h * 0.85;
        const rr = W * (0.22 + r() * 0.08);
        const col = i ? c.primary : c.accent;
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${col}" opacity="0.35"/><circle cx="${cx + rr * 0.55}" cy="${cy - rr * 0.35}" r="${rr * 0.55}" fill="${col}" opacity="0.28"/>`);
      });
    }
    if (d === "dots") {
      const b = freeCorners[0];
      const gap = 26;
      let s = "";
      for (let y = b.y + 30; y < b.y + b.h - 10; y += gap) for (let x = b.x + 30; x < b.x + b.w - 10; x += gap) s += `<circle cx="${x}" cy="${y}" r="4.5"/>`;
      parts.push(`<g fill="${onBg}" opacity="0.22">${s}</g>`);
    }
    if (d === "stripes") {
      const b = freeCorners[0];
      defs.push(`<clipPath id="stc"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/></clipPath>`);
      let s = "";
      for (let k = -H; k < W + H; k += 34) s += `<path d="M${k} ${b.y + b.h + 10}L${k + b.h + 20} ${b.y - 10}" stroke="${c.accent}" stroke-width="12"/>`;
      parts.push(`<g clip-path="url(#stc)" opacity="0.55">${s}</g>`);
    }
    if (d === "confetti") {
      let n = 0, guard = 0;
      while (n < 24 && guard++ < 200) {
        const x = r() * W, y = r() * H;
        const bx = B(x - 10, y - 10, 20, 20);
        if (textBoxes.some((t) => overlap(bx, t) > 0) || (P && overlap(bx, P) > 0)) continue;
        const col = [c.primary, c.accent, onBg][n % 3];
        const rot = Math.round(r() * 180);
        parts.push(n % 2 ? `<rect x="${x}" y="${y}" width="${10 + r() * 10}" height="${6 + r() * 5}" rx="2" fill="${col}" opacity="0.8" transform="rotate(${rot} ${x} ${y})"/>` : `<circle cx="${x}" cy="${y}" r="${4 + r() * 5}" fill="${col}" opacity="0.8"/>`);
        n++;
      }
    }
    if (d === "waves") {
      const y0 = H * (L.head.box.y > H / 2 ? 0.08 : 0.94);
      let s = "";
      for (let k = 0; k < 3; k++) {
        let path = `M0 ${y0 + k * 18}`;
        for (let x = 0; x <= W; x += 60) path += ` Q${x + 30} ${y0 + k * 18 + (k % 2 ? 14 : -14)} ${x + 60} ${y0 + k * 18}`;
        s += `<path d="${path}" fill="none" stroke="${c.accent}" stroke-width="4" opacity="${0.55 - k * 0.12}"/>`;
      }
      parts.push(s);
    }
    if (d === "rays" && P) {
      let s = "";
      const R = Math.max(W, H);
      for (let k = 0; k < 24; k += 2) {
        const a1 = (k / 24) * Math.PI * 2, a2 = ((k + 1) / 24) * Math.PI * 2;
        s += `<path d="M${pc.x} ${pc.y}L${pc.x + Math.cos(a1) * R} ${pc.y + Math.sin(a1) * R}L${pc.x + Math.cos(a2) * R} ${pc.y + Math.sin(a2) * R}Z"/>`;
      }
      defs.push(`<radialGradient id="rayf" cx="${pc.x}" cy="${pc.y}" r="${R * 0.7}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="raym"><rect width="${W}" height="${H}" fill="url(#rayf)"/></mask>`);
      parts.push(`<g fill="${c.accent}" opacity="0.28" mask="url(#raym)">${s}</g>`);
    }
    if (d === "disc" && P) {
      const fill = contrast(c.primary, c.bg) > 1.25 ? c.primary : c.accent;
      parts.push(`<circle cx="${pc.x}" cy="${pc.y}" r="${pc.r}" fill="${fill}"/>`);
      parts.push(`<circle cx="${pc.x}" cy="${pc.y}" r="${pc.r + 22}" fill="none" stroke="${fill}" stroke-width="3" opacity="0.5"/>`);
    }
    if (d === "rings") {
      for (let k = 0; k < 3; k++) parts.push(`<circle cx="${pc.x}" cy="${pc.y}" r="${pc.r * (0.95 + k * 0.2)}" fill="none" stroke="${isPhoto ? "#FFFFFF" : c.accent}" stroke-width="3" opacity="${0.5 - k * 0.13}"/>`);
    }
    if (d === "frame" || (L.frame && !decor.includes("frame"))) {
      const inset = Math.round(W * 0.026);
      parts.push(`<rect x="${inset}" y="${inset}" width="${W - 2 * inset}" height="${H - 2 * inset}" rx="18" fill="none" stroke="${isPhoto ? "#FFFFFF" : onBg}" stroke-opacity="0.55" stroke-width="3"/>`);
    }
  }

  // panels (bands / cards) above decor, below the subject
  for (const pn of L.panels) {
    parts.push(`<rect x="${pn.box.x}" y="${pn.box.y}" width="${pn.box.w}" height="${pn.box.h}" rx="${pn.radius}" fill="${pn.fill}"/>`);
  }
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs>${defs.join("")}</defs>${parts.join("")}</svg>`;
}

// Sparkles go above the subject so they read as "shine"
function sparkleSvg(spec: DesignSpec, L: Layout, W: number, H: number, isPhoto: boolean): string | null {
  if (!spec.decor.includes("sparkles")) return null;
  const P = L.product ?? B(W * 0.15, H * 0.2, W * 0.7, H * 0.5);
  const r = rng(spec.seed + 13);
  const col = isPhoto ? "#FFFFFF" : isDark(spec.colors.bg) ? spec.colors.accent : spec.colors.primary;
  const textBoxes = [L.head.box, ...(L.foot ? [L.foot.box] : [])];
  let s = "";
  let n = 0, guard = 0;
  while (n < 6 && guard++ < 80) {
    const edge = r() < 0.5;
    const x = P.x + (edge ? (r() < 0.5 ? r() * 0.18 : 0.82 + r() * 0.18) : r()) * P.w;
    const y = P.y + (edge ? r() : r() * 0.4) * P.h;
    const rr = 14 + r() * 26;
    if (textBoxes.some((t) => overlap(B(x - rr, y - rr, rr * 2, rr * 2), t) > 0)) continue;
    s += star(x, y, rr, col, 0.9);
    n++;
  }
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

// ---------------------------------------------------------------- badge
function badgeLayers(spec: DesignSpec, p: TypePreset, badge: { cx: number; cy: number; d: number }, W: number, H: number): { svg: string; node: Node } | null {
  const t = spec.text;
  const hi = cleanText(t.highlight);
  if (!hi || spec.badgeShape === "none") return null;
  const c = spec.colors;
  const { cx, cy, d } = badge;
  const rad = d / 2;
  let fill = c.primary, fg = readable(c.onPrimary, c.primary), shape = "";
  const rot = -8;
  switch (spec.badgeShape) {
    case "burst": {
      fill = c.accent; fg = bestOn(c.accent, [c.text, "#111111", "#FFFFFF", c.primary]);
      const n = 18; let path = "";
      for (let k = 0; k < n * 2; k++) {
        const a = (k / (n * 2)) * Math.PI * 2 - Math.PI / 2;
        const rr = k % 2 ? rad * 0.84 : rad * 1.04;
        path += `${k ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
      }
      shape = `<path d="${path}Z" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})"/>`;
      break;
    }
    case "stamp": {
      fill = c.surface; fg = readable(c.primary, c.surface);
      shape = `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}"/><circle cx="${cx}" cy="${cy}" r="${rad - 12}" fill="none" stroke="${fg}" stroke-width="3" stroke-dasharray="10 8"/>`;
      break;
    }
    case "tag": {
      fill = c.accent; fg = bestOn(c.accent, [c.text, "#111111", "#FFFFFF"]);
      const w = d * 1.3, h = d * 0.62;
      shape = `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h * 0.22}" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})"/><circle cx="${cx - w / 2 + h * 0.28}" cy="${cy}" r="${h * 0.09}" fill="${c.bg}" transform="rotate(${rot} ${cx} ${cy})"/>`;
      break;
    }
    case "circle":
    default:
      shape = `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}"/><circle cx="${cx}" cy="${cy}" r="${rad - 10}" fill="none" stroke="${fg}" stroke-opacity="0.45" stroke-width="2.5"/>`;
  }
  const shadow = `<defs><filter id="bs" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.25"/></filter></defs>`;
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${shadow}<g filter="url(#bs)">${shape}</g></svg>`;

  const inner = spec.badgeShape === "tag" ? d * 1.0 : d * 0.7;
  const f = p.heading;
  const txt = applyCase(hi, "normal", f.forceUpper);
  let size = Math.round(d * 0.36);
  let lines = wrap(f, txt, size, inner, f.tracking);
  while (size > 18 && (lines.length > 2 || lines.some((l) => measure(f, l, size, f.tracking) > inner) || lines.length * size * 1.02 > d * (spec.badgeShape === "tag" ? 0.42 : 0.55))) {
    size -= 2;
    lines = wrap(f, txt, size, inner, f.tracking);
  }
  const label = cleanText(t.highlightLabel);
  const ls = Math.round(clamp(d * 0.085, 14, 26));
  const lf = p.accent.family === "Pacifico" ? { family: "Pacifico", weight: 400 as const } : { family: p.accent.family, weight: p.accent.weight };
  const node = el("div", { position: "absolute", left: cx - d * 0.7, top: cy - d / 2, width: d * 1.4, height: d, alignItems: "center", justifyContent: "center", transform: `rotate(${rot}deg)` },
    label ? el("div", { fontFamily: lf.family, fontWeight: lf.weight, fontSize: ls, color: fg, letterSpacing: lf.family === "Pacifico" ? 0 : ls * 0.12, textTransform: lf.family === "Pacifico" ? "none" : "uppercase", marginBottom: 4 }, truncateToWidth(lf, label, ls, inner)) : null,
    ...lines.map((l) => el("div", { fontFamily: f.family, fontWeight: f.weight, fontSize: size, lineHeight: 1.02, color: fg, letterSpacing: f.tracking * size }, l)));
  return { svg, node };
}

// ---------------------------------------------------------------- main
export async function renderDesign(o: { spec: DesignSpec; ratio: Ratio; product: ProductAsset; background: Buffer | null }): Promise<Buffer> {
  const { spec, ratio } = o;
  const { w: W, h: H } = SIZES[ratio];
  const p = TYPE_PRESETS[spec.typography] ?? TYPE_PRESETS.modern_bold;
  const hasProduct = Boolean(o.product.cutout || o.product.photo);
  const L = computeLayout(spec, W, H, ratio, hasProduct);

  // subject size preference
  if (L.product) {
    const k = spec.productSize === "small" ? 0.8 : spec.productSize === "medium" ? 0.91 : 1;
    const P = L.product;
    L.product = B(P.x + (P.w * (1 - k)) / 2, P.y + P.h * (1 - k), P.w * k, P.h * k);
  }

  const bg = await paintBackground(spec, W, H, o.background);

  // per-zone ink (text colour, scrim)
  const zones = [L.head, ...(L.foot ? [L.foot] : [])];
  const inks: Ink[] = [];
  const scrims: { box: Box; color: string; alpha: number }[] = [];
  for (const z of zones) {
    const panel = L.panels.find((pn) => overlap(pn.box, z.box) > z.box.w * z.box.h * 0.6);
    if (panel) { inks.push(inkFor(spec, hexToRgb(panel.fill), 0, false, true)); continue; }
    const st = bg.isPhoto ? await regionStats(bg.img, z.box, W, H) : { mean: hexToRgb(spec.background === "gradient" ? mix(spec.colors.bg, spec.colors.primary, (z.box.y + z.box.h / 2) / H * 0.35) : spec.colors.bg), sd: 0 };
    const strips: RGB[] = [st.mean];
    if (bg.isPhoto) for (let k = 0; k < 3; k++) strips.push((await regionStats(bg.img, B(z.box.x, z.box.y + (z.box.h * k) / 3, z.box.w, z.box.h / 3), W, H)).mean);
    const ink = inkFor(spec, st.mean, st.sd, bg.isPhoto, false, strips);
    if (ink.scrim) scrims.push({ box: z.box, ...ink.scrim });
    inks.push(ink);
  }

  // highlight: badge near the subject when possible, otherwise it flows inline with the text
  const badge = L.badge ? badgeLayers(spec, p, L.badge, W, H) : null;
  if (badge) zones.forEach((z) => { z.parts = z.parts.filter((x) => x !== "highlight"); });
  if (!badge && cleanText(spec.text.highlight) && !zones.some((z) => z.parts.includes("highlight"))) {
    const target = zones.find((z) => !L.headUnder || z !== L.head) ?? L.head;
    const at = target.parts.indexOf("cta");
    target.parts.splice(at < 0 ? target.parts.length : at, 0, "highlight");
  }

  const layers: sharp.OverlayOptions[] = [];
  layers.push({ input: Buffer.from(decorSvg(spec, L, W, H, bg.isPhoto, scrims)), left: 0, top: 0 });

  const headNode = composeZone({ spec, p, ink: inks[0], zone: L.head, c: spec.colors });
  const footNode = L.foot ? composeZone({ spec, p, ink: inks[1], zone: L.foot, c: spec.colors }) : null;
  const root = (...kids: (Node | null)[]) => el("div", { width: W, height: H, position: "relative" }, ...kids);

  if (L.headUnder && headNode) layers.push({ input: await renderLayer(root(headNode), W, H), left: 0, top: 0 });

  if (L.product) {
    const flat = spec.layout === "frame_card" || spec.layout === "split_left" || spec.layout === "split_right";
    if (o.product.cutout) layers.push(...(await placeCutout(o.product.cutout, L.product, W, H, L.anchor)));
    else if (o.product.photo) layers.push(...(await placeCard(o.product.photo, L.product, { border: 14, radius: 22, rotate: flat ? 0 : -2 })));
  }

  const sp = sparkleSvg(spec, L, W, H, bg.isPhoto);
  if (sp) layers.push({ input: Buffer.from(sp), left: 0, top: 0 });
  if (badge) layers.push({ input: Buffer.from(badge.svg), left: 0, top: 0 });

  layers.push({ input: await renderLayer(root(L.headUnder ? null : headNode, footNode, badge?.node ?? null), W, H), left: 0, top: 0 });

  return sharp(bg.img).composite(layers).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toBuffer();
}

// Exposed for the UI swatches
export function previewColors(spec: DesignSpec): string[] {
  return [spec.colors.bg, spec.colors.primary, spec.colors.accent, spec.colors.text].map((x) => rgbToHex(hexToRgb(x)));
}
