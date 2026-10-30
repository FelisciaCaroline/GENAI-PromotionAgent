import { runPosterSet, type PosterEvent } from "@/lib/agents/designer-agent";
import { DEFAULT_LANG, LanguageConfigSchema } from "@/lib/agents/schemas";
import type { Ratio } from "@/lib/image/compose";
import { friendlyError } from "@/lib/utils/retry";
import { limited } from "@/lib/utils/rate-limit";

export const maxDuration = 120;
export const runtime = "nodejs";

// SSE: konsep dikirim dulu, lalu tiap poster begitu selesai dirender
export async function POST(req: Request) {
  const rl = limited(req, "posters", 6);
  if (rl) return rl;

  let input: Parameters<typeof runPosterSet>[0];
  try {
    const f = await req.formData();
    const produk = String(f.get("produk") ?? "").trim();
    if (produk.length < 2) return Response.json({ error: "Isi nama produk dulu ya." }, { status: 400 });
    const file = f.get("photo");
    let photo: Buffer | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) return Response.json({ error: "Ukuran foto maksimal 5MB." }, { status: 400 });
      photo = Buffer.from(await file.arrayBuffer());
    }
    const s = (k: string, d = "") => String(f.get(k) ?? d).trim();
    const ratio = (["1:1", "4:5", "9:16"].includes(s("ratio")) ? s("ratio") : "4:5") as Ratio;
    input = {
      photo,
      produk: produk.slice(0, 120),
      goal: s("goal", `Promo ${produk}`).slice(0, 300),
      target: s("target", "pelanggan umum").slice(0, 120),
      penawaran: s("penawaran", "promo spesial").slice(0, 120),
      periode: s("periode", "periode terbatas").slice(0, 80),
      ratio,
      bgMode: s("bgMode") === "solid" ? "solid" : "ai",
      languageConfig: LanguageConfigSchema.parse({ ...DEFAULT_LANG, ...JSON.parse(s("languageConfig", "{}")) }),
      hint: s("hint").slice(0, 160) || undefined,
      count: 3,
    };
  } catch (e) {
    return Response.json({ error: friendlyError(e) }, { status: 400 });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      try {
        await runPosterSet(input, (e: PosterEvent) => send(e));
        send({ type: "done" });
      } catch (e) {
        send({ type: "error", message: friendlyError(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
