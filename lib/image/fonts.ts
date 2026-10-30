import { readFileSync } from "node:fs";
import path from "node:path";
import opentype from "opentype.js";
import type { FontRef } from "./design-catalog";

type FontFile = { name: string; file: string; weight: 400 | 600 | 700 | 800; style: "normal" | "italic" };

// Every font available to Satori. All files are Latin-only WOFF (OFL licensed).
const FILES: FontFile[] = [
  { name: "DM Serif Display", file: "DMSerifDisplay-400.woff", weight: 400, style: "normal" },
  { name: "Inter", file: "Inter-400.woff", weight: 400, style: "normal" },
  { name: "Inter", file: "Inter-700.woff", weight: 700, style: "normal" },
  { name: "Inter", file: "Inter-800.woff", weight: 800, style: "normal" },
  { name: "Space Mono", file: "SpaceMono-400.woff", weight: 400, style: "normal" },
  { name: "Space Mono", file: "SpaceMono-700.woff", weight: 700, style: "normal" },
  { name: "Poppins", file: "Poppins-400.woff", weight: 400, style: "normal" },
  { name: "Poppins", file: "Poppins-600.woff", weight: 600, style: "normal" },
  { name: "Poppins", file: "Poppins-800.woff", weight: 800, style: "normal" },
  { name: "Playfair Display", file: "PlayfairDisplay-700.woff", weight: 700, style: "normal" },
  { name: "Playfair Display", file: "PlayfairDisplay-700-italic.woff", weight: 700, style: "italic" },
  { name: "Anton", file: "Anton-400.woff", weight: 400, style: "normal" },
  { name: "Bebas Neue", file: "BebasNeue-400.woff", weight: 400, style: "normal" },
  { name: "Lilita One", file: "LilitaOne-400.woff", weight: 400, style: "normal" },
  { name: "Pacifico", file: "Pacifico-400.woff", weight: 400, style: "normal" },
  { name: "Archivo Black", file: "ArchivoBlack-400.woff", weight: 400, style: "normal" },
];

export type SatoriFont = { name: string; data: Buffer; weight: 400 | 600 | 700 | 800; style: "normal" | "italic" };

let cache: { satori: SatoriFont[]; parsed: Map<string, opentype.Font> } | null = null;

const key = (family: string, weight: number, style = "normal") => `${family}|${weight}|${style}`;

function load() {
  if (cache) return cache;
  const dir = path.join(process.cwd(), "assets", "fonts");
  const satori: SatoriFont[] = [];
  const parsed = new Map<string, opentype.Font>();
  for (const f of FILES) {
    const data = readFileSync(path.join(dir, f.file));
    satori.push({ name: f.name, data, weight: f.weight, style: f.style });
    const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    parsed.set(key(f.name, f.weight, f.style), opentype.parse(ab));
  }
  cache = { satori, parsed };
  return cache;
}

export function satoriFonts(): SatoriFont[] {
  return load().satori;
}

function fontOf(ref: FontRef): opentype.Font {
  const p = load().parsed;
  return p.get(key(ref.family, ref.weight, ref.style)) ?? p.get(key(ref.family, ref.weight)) ?? p.get(key("Inter", 400))!;
}

// Real text width in px using the font's glyph advances (+ letter spacing in em)
export function measure(ref: FontRef, text: string, size: number, trackingEm = 0): number {
  if (!text) return 0;
  const f = fontOf(ref);
  const w = f.getAdvanceWidth(text, size, { kerning: true });
  return w + Math.max(0, text.length - 1) * trackingEm * size;
}

// Greedy word wrap that mirrors how we render lines (one row per line)
export function wrap(ref: FontRef, text: string, size: number, maxWidth: number, trackingEm = 0): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (!cur || measure(ref, next, size, trackingEm) <= maxWidth) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function widest(ref: FontRef, lines: string[], size: number, trackingEm = 0): number {
  return Math.max(0, ...lines.map((l) => measure(ref, l, size, trackingEm)));
}
