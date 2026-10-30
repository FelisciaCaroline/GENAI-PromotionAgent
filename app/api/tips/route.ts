import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getGroq } from "@/lib/ai/groq";
import { MODELS } from "@/lib/ai/models";
import { limited } from "@/lib/utils/rate-limit";

export async function GET(req: Request) {
  const rl = limited(req, "tips", 10);
  if (rl) return rl;
  try {
    const { text } = await generateText({
      model: getGroq()(MODELS.fast),
      system: "Kamu konsultan pemasaran untuk UMKM Indonesia. Beri SATU tips promosi praktis (maks 30 kata), Bahasa Indonesia santai, tanpa pembuka.",
      prompt: "Tips promosi hari ini.",
      temperature: 0.9,
    });
    return NextResponse.json({ text: text.trim() });
  } catch {
    return NextResponse.json({ text: "Sebar promo sebelum jam ramai, bukan saat ramai, supaya pelanggan sempat melihatnya." });
  }
}
