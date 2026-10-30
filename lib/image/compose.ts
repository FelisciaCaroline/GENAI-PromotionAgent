import sharp from "sharp";
import { PALETTES, type PaletteId, type TemplateId } from "./catalog";
import { placeCard, placeCutout } from "./product";
import { renderLayer } from "./satori";
import { TEMPLATES, type PosterText } from "./templates";

export type Ratio = "1:1" | "4:5" | "9:16";
export const SIZES: Record<Ratio, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "9:16": { w: 1080, h: 1920 },
};

// Latar cadangan dari palet (dipakai jika latar AI gagal / mode warna polos)
export async function gradientBackground(paletteId: PaletteId, ratio: Ratio, seed = 1): Promise<Buffer> {
  const { w, h } = SIZES[ratio];
  const p = PALETTES[paletteId];
  const r = (n: number) => ((Math.sin(seed * 9301 + n * 49297) + 1) / 2);
  const circles = [0, 1, 2, 3].map((i) => `<circle cx="${Math.round(r(i) * w)}" cy="${Math.round(r(i + 9) * h)}" r="${Math.round(w * (0.18 + r(i + 3) * 0.2))}" fill="${p.accent}" opacity="0.22"/>`).join("");
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${p.bg2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${circles}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function composePoster(o: {
  background: Buffer;
  cutout: Buffer | null;
  photo: Buffer | null;
  ratio: Ratio;
  templateId: TemplateId;
  paletteId: PaletteId;
  text: PosterText;
}): Promise<Buffer> {
  const { w, h } = SIZES[o.ratio];
  const tpl = TEMPLATES[o.templateId];
  const p = PALETTES[o.paletteId];
  const lay = tpl.layout(w, h);
  const bgResized = await sharp(o.background).resize(w, h, { fit: "cover" }).png().toBuffer();
  // Warna teks adaptif: ukur kecerahan area atas latar
  const top = await sharp(bgResized).extract({ left: 0, top: 0, width: w, height: Math.round(h * 0.25) }).stats();
  const [r, g, b] = top.channels.map((c) => c.mean);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const ctx = { w, h, t: o.text, p, box: lay.box, fg: lum > 0.58 ? p.ink : p.paper };

  const layers: sharp.OverlayOptions[] = [];
  const under = tpl.under(ctx);
  if (under) layers.push({ input: await renderLayer(under, w, h), left: 0, top: 0 });

  if (o.cutout) layers.push(...(await placeCutout(o.cutout, lay.box, w, h)));
  else if (o.photo) layers.push(...(await placeCard(o.photo, lay.box, { border: lay.border ?? 14, radius: lay.radius ?? 12, rotate: lay.rotate ?? 0 })));

  layers.push({ input: await renderLayer(tpl.over(ctx), w, h), left: 0, top: 0 });
  return sharp(bgResized).composite(layers).jpeg({ quality: 86 }).toBuffer();
}
