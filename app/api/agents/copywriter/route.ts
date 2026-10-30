import { z } from "zod";
import { streamCopywriter } from "@/lib/agents/copywriter-agent";
import { DEFAULT_LANG, LanguageConfigSchema } from "@/lib/agents/schemas";
import { friendlyError } from "@/lib/utils/retry";
import { limited } from "@/lib/utils/rate-limit";

export const maxDuration = 60;
const Body = z.object({
  goal: z.string().min(3).max(500),
  produk: z.string().min(1).max(200),
  target: z.string().max(200).default("pelanggan umum"),
  penawaran: z.string().max(200).default("promo spesial"),
  waktuPromo: z.string().optional(),
  durasi: z.number().min(10).max(60).optional(),
  languageConfig: LanguageConfigSchema.partial().optional(),
});

// Streaming: teks JSON dialirkan, client menggabungkan lalu parse
export async function POST(req: Request) {
  const rl = limited(req, "copywriter");
  if (rl) return rl;
  try {
    const b = Body.parse(await req.json());
    const result = streamCopywriter({ ...b, languageConfig: LanguageConfigSchema.parse({ ...DEFAULT_LANG, ...b.languageConfig }) });
    return result.toTextStreamResponse();
  } catch (e) {
    return Response.json({ error: friendlyError(e) }, { status: 400 });
  }
}
