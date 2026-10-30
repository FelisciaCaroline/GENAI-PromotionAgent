import { runPromptPosters, type PromptPosterEvent, type PromptPosterInput } from "@/lib/agents/prompt-poster-agent";
import type { Ratio } from "@/lib/image/compose";
import { friendlyError } from "@/lib/utils/retry";
import { limited } from "@/lib/utils/rate-limit";

export const maxDuration = 120;
export const runtime = "nodejs";

// SSE: status -> brief (specs + cutout) -> one event per finished poster
export async function POST(req: Request) {
  const rl = limited(req, "prompt-posters", 6);
  if (rl) return rl;

  let input: PromptPosterInput;
  try {
    const f = await req.formData();
    const prompt = String(f.get("prompt") ?? "").trim();
    if (prompt.length < 8) return Response.json({ error: "Ceritakan poster yang kamu mau (minimal satu kalimat)." }, { status: 400 });
    const file = f.get("photo");
    let photo: Buffer | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > 8 * 1024 * 1024) return Response.json({ error: "Ukuran foto maksimal 8MB." }, { status: 400 });
      photo = Buffer.from(await file.arrayBuffer());
    }
    const s = (k: string, d = "") => String(f.get(k) ?? d).trim();
    input = {
      prompt: prompt.slice(0, 1500),
      photo,
      ratio: (["1:1", "4:5", "9:16"].includes(s("ratio")) ? s("ratio") : "4:5") as Ratio,
      lang: s("lang", "auto").slice(0, 5) || "auto",
      count: Math.min(4, Math.max(1, Number(s("count", "3")) || 3)),
      aiSubject: s("aiSubject", "1") !== "0",
      bgMode: s("bgMode") === "solid" ? "solid" : "auto",
    };
  } catch (e) {
    return Response.json({ error: friendlyError(e) }, { status: 400 });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      try {
        await runPromptPosters(input, (e: PromptPosterEvent) => send(e));
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
