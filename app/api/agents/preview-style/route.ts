import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getGroq } from "@/lib/ai/groq";
import { MODELS } from "@/lib/ai/models";
import { langName } from "@/lib/ai/languages";
import { styleOf } from "@/lib/ai/styles";
import { DEFAULT_LANG, LanguageConfigSchema } from "@/lib/agents/schemas";
import { friendlyError } from "@/lib/utils/retry";
import { limited } from "@/lib/utils/rate-limit";

// Pratinjau 1 kalimat contoh dengan model ringan
export async function POST(req: Request) {
  const rl = limited(req, "preview", 30);
  if (rl) return rl;
  try {
    const raw = await req.json();
    const c = LanguageConfigSchema.parse({ ...DEFAULT_LANG, ...raw });
    const langs = [c.primary, ...c.secondary].map(langName).join(" + ");
    const { text } = await generateText({
      model: getGroq()(MODELS.fast),
      system: "Kamu copywriter UMKM. Tulis SATU kalimat promo pendek (maks 25 kata) tentang kopi susu diskon 20%. Angka tidak boleh berubah. Balas hanya kalimatnya.",
      prompt: `Bahasa: ${langs}. Mode: ${c.mixMode}${c.mixMode === "mixed" ? ` (${c.mixRatio}% bahasa utama)` : ""}. Gaya: ${styleOf(c.style).label} (${styleOf(c.style).guide}). Emoji: ${c.emoji ? "ya" : "tidak"}.`,
    });
    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    console.error("[preview-style]", e);
    return NextResponse.json({ error: friendlyError(e) }, { status: 500 });
  }
}
