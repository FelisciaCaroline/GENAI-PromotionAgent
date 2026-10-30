import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";

export type RemoveBgType = "auto" | "product" | "person" | "animal" | "car";
export type RemoveBgResult = { cutout: Buffer | null; error?: string; preview?: boolean };

const cache = new Map<string, Buffer>();
const remember = (k: string, v: Buffer) => {
  cache.set(k, v);
  if (cache.size > 30) cache.delete(cache.keys().next().value as string);
};

const MESSAGES: Record<number, string> = {
  400: "Remove.bg tidak menemukan objek utama di foto.",
  402: "Kredit Remove.bg habis.",
  403: "REMOVEBG_API_KEY tidak valid.",
  429: "Remove.bg sedang membatasi permintaan (rate limit).",
};

async function callApi(photo: Buffer, key: string, size: string, type: RemoveBgType): Promise<{ status: number; body: Buffer }> {
  const form = new FormData();
  form.append("image_file", new Blob([new Uint8Array(photo)], { type: "image/jpeg" }), "subject.jpg");
  form.append("size", size);
  form.append("format", "png");
  // remove.bg has no "animal" type; "auto" handles it
  if (type !== "auto" && type !== "animal") form.append("type", type);
  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": key },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  return { status: res.status, body: Buffer.from(await res.arrayBuffer()) };
}

// If remove.bg returned a smaller image (free "preview" tier), upscale only its alpha mask
// and apply it to the original full-resolution photo, so the product stays sharp.
async function restoreResolution(original: Buffer, cut: Buffer): Promise<Buffer> {
  const [om, cm] = await Promise.all([sharp(original).metadata(), sharp(cut).metadata()]);
  const W = om.width ?? 0, H = om.height ?? 0;
  if (!W || !H || (cm.width ?? 0) >= W * 0.95) return cut;
  const alpha = await sharp(cut).ensureAlpha().extractChannel(3).resize(W, H, { kernel: "lanczos3" }).blur(0.6).extractChannel(0).raw().toBuffer();
  const rgb = await sharp(original).removeAlpha().resize(W, H).raw().toBuffer();
  return sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).joinChannel(alpha, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
}

// Fraction of the image that is opaque (0..1): sanity check that a subject was actually kept
// (note: sharp's stats() ignores extractChannel, so read the alpha channel from the full stats)
export async function alphaCoverage(png: Buffer): Promise<number> {
  const s = await sharp(png).ensureAlpha().stats();
  return (s.channels[3]?.mean ?? 0) / 255;
}

// Remove background via remove.bg. Falls back to the free "preview" size when credits run out.
export async function removeBackgroundDetailed(photo: Buffer, type: RemoveBgType = "auto"): Promise<RemoveBgResult> {
  const key = process.env.REMOVEBG_API_KEY?.trim();
  if (!key) return { cutout: null, error: "REMOVEBG_API_KEY belum diisi." };

  const hash = createHash("sha1").update(photo).update(type).digest("hex");
  const hit = cache.get(hash);
  if (hit) return { cutout: hit };

  const preferred = process.env.REMOVEBG_SIZE?.trim() || "auto";
  const sizes = preferred === "preview" ? ["preview"] : [preferred, "preview"];
  let lastError = "Remove.bg gagal.";

  for (const size of sizes) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { status, body } = await callApi(photo, key, size, type);
        if (status === 200) {
          const full = await restoreResolution(photo, body);
          const cov = await alphaCoverage(full);
          if (cov < 0.015) return { cutout: null, error: "Remove.bg menghapus hampir seluruh gambar (objek tidak terdeteksi)." };
          remember(hash, full);
          return { cutout: full, preview: size === "preview" };
        }
        lastError = MESSAGES[status] ?? `Remove.bg error ${status}.`;
        console.error("[removebg]", status, body.toString("utf8").slice(0, 300));
        if (status === 429 || status >= 500) { await new Promise((r) => setTimeout(r, 1200 * (attempt + 1))); continue; }
        break; // 400/402/403: retrying the same size will not help
      } catch (e) {
        console.error("[removebg]", e);
        lastError = "Remove.bg tidak bisa dihubungi.";
      }
    }
    // Only drop to the preview size when the paid size is the problem (no credits)
    if (!/Kredit/.test(lastError)) break;
  }
  return { cutout: null, error: lastError };
}

// Backward-compatible API used by the old concept pipeline
export async function removeBackground(photo: Buffer): Promise<Buffer | null> {
  return (await removeBackgroundDetailed(photo, "product")).cutout;
}

// Local fallback for AI-generated subjects shot on a white backdrop: flood-fill the
// near-white background from the image border and feather the edge.
export async function removeWhiteBackground(img: Buffer, tolerance = 26): Promise<Buffer | null> {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const n = W * H;
  const bgMask = new Uint8Array(n);
  const isBg = (i: number) => {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    return 255 - Math.min(r, g, b) <= tolerance && Math.max(r, g, b) - Math.min(r, g, b) <= 18;
  };
  const stack: number[] = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const i = stack.pop()!;
    if (bgMask[i] || !isBg(i)) continue;
    bgMask[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }
  let fg = 0;
  const alpha = Buffer.alloc(n);
  for (let i = 0; i < n; i++) { alpha[i] = bgMask[i] ? 0 : 255; fg += bgMask[i] ? 0 : 1; }
  const cov = fg / n;
  if (cov < 0.03 || cov > 0.92) return null; // backdrop was not clean white
  const soft = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } }).blur(1.1).extractChannel(0).raw().toBuffer();
  return sharp(data, { raw: { width: W, height: H, channels: 3 } }).joinChannel(soft, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
}
