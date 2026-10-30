import satori from "satori";
import sharp from "sharp";
import type { ReactNode } from "react";
import { satoriFonts } from "./fonts";

export type Style = Record<string, string | number>;
export type Node = { type: string; props: { style: Style; children?: unknown } };
type Child = Node | string | null | false | undefined;

// Pembuat elemen ringan (tanpa JSX). Semua div otomatis display:flex (syarat Satori).
export function el(type: string, style: Style = {}, ...children: Child[]): Node {
  const kids = children.filter((c): c is Node | string => c !== null && c !== undefined && c !== false);
  const base: Style = type === "div" ? { display: "flex", flexDirection: "column" } : {};
  return { type, props: { style: { ...base, ...style }, children: kids.length === 1 ? kids[0] : kids } };
}

export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// Ukuran font yang menyesuaikan panjang teks agar muat dalam lebar x baris
export function fit(text: string, maxWidth: number, base: number, charFactor: number, lines = 1): number {
  const need = Math.max(1, text.length) * charFactor;
  return Math.max(18, Math.min(base, Math.floor((maxWidth * lines * 0.92) / need)));
}

// Render pohon elemen menjadi PNG transparan
export async function renderLayer(node: Node, width: number, height: number): Promise<Buffer> {
  const svg = await satori(node as unknown as ReactNode as never, { width, height, fonts: satoriFonts() });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
