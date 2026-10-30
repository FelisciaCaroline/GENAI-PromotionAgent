import sharp from "sharp";

export type Box = { x: number; y: number; w: number; h: number };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

// Rapikan foto: auto-rotate EXIF + batasi ukuran
export async function normalizePhoto(buf: Buffer): Promise<Buffer> {
  return sharp(buf).rotate().resize(1400, 1400, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
}

// Bayangan lembut dari siluet (alpha) gambar
export async function dropShadow(img: Buffer, opacity = 0.32): Promise<{ buf: Buffer; pad: number }> {
  const pad = 48;
  const buf = await sharp(img)
    .ensureAlpha()
    .linear([0, 0, 0, 1], [0, 0, 0, 0])
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: CLEAR })
    .blur(14)
    .composite([{ input: Buffer.from([0, 0, 0, Math.round(255 * opacity)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: "dest-in" }])
    .png()
    .toBuffer();
  return { buf, pad };
}

export async function contactShadow(cx: number, cy: number, rx: number, W: number, H: number): Promise<sharp.OverlayOptions> {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="b" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="14"/></filter></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="20" fill="rgba(0,0,0,0.42)" filter="url(#b)"/></svg>`;
  return { input: Buffer.from(svg), left: 0, top: 0 };
}

// Produk transparan: trim margin, skala, taruh rata bawah di dalam box
export async function placeCutout(png: Buffer, box: Box, W: number, H: number, anchor: "bottom" | "center" = "bottom"): Promise<sharp.OverlayOptions[]> {
  const trimmed = await sharp(png).trim({ threshold: 8 }).toBuffer().catch(() => png);
  const prod = await sharp(trimmed).resize({ width: Math.round(box.w), height: Math.round(box.h), fit: "inside" }).png().toBuffer();
  const meta = await sharp(prod).metadata();
  const pw = meta.width ?? box.w, ph = meta.height ?? box.h;
  const left = Math.round(box.x + (box.w - pw) / 2);
  const top = Math.round(anchor === "center" ? box.y + (box.h - ph) / 2 : box.y + box.h - ph);
  const sh = await dropShadow(prod);
  return [
    await contactShadow(left + pw / 2, top + ph - 4, pw * 0.38, W, H),
    { input: sh.buf, left: left - sh.pad + 8, top: top - sh.pad + 16 },
    { input: prod, left, top },
  ];
}

// Tanpa remove.bg: foto jadi "kartu" bersudut membulat + border putih + sedikit miring
export async function placeCard(photo: Buffer, box: Box, opts: { border: number; radius: number; rotate: number }): Promise<sharp.OverlayOptions[]> {
  const m = await sharp(photo).metadata();
  const ratio = Math.min(1.33, Math.max(0.75, (m.width ?? 1) / (m.height ?? 1)));
  const cw = Math.round(Math.min(box.w, box.h * ratio));
  const ch = Math.round(cw / ratio);
  const b = opts.border;
  const inner = await sharp(photo).resize(Math.max(1, cw - 2 * b), Math.max(1, ch - 2 * b), { fit: "cover" }).png().toBuffer();
  const base = await sharp({ create: { width: cw, height: ch, channels: 4, background: "#ffffff" } }).composite([{ input: inner, left: b, top: b }]).png().toBuffer();
  const mask = Buffer.from(`<svg width="${cw}" height="${ch}" xmlns="http://www.w3.org/2000/svg"><rect width="${cw}" height="${ch}" rx="${opts.radius}" fill="#fff"/></svg>`);
  let card = await sharp(base).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  if (opts.rotate) card = await sharp(card).rotate(opts.rotate, { background: CLEAR }).png().toBuffer();
  const cm = await sharp(card).metadata();
  const left = Math.round(box.x + (box.w - (cm.width ?? cw)) / 2);
  const top = Math.round(box.y + (box.h - (cm.height ?? ch)) / 2);
  const sh = await dropShadow(card, 0.28);
  return [{ input: sh.buf, left: left - sh.pad + 6, top: top - sh.pad + 14 }, { input: card, left, top }];
}
