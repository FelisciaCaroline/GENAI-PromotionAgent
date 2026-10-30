import { randomUUID } from "node:crypto";
import { buildGraph, type CampaignInput } from "@/lib/agents/graph";
import { normalizeRows } from "@/lib/agents/sample-data";
import { DEFAULT_LANG, LanguageConfigSchema, type AgentEvent } from "@/lib/agents/schemas";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getServerClient } from "@/lib/supabase/server";
import { uploadPoster } from "@/lib/supabase/storage";
import { friendlyError } from "@/lib/utils/retry";
import { limited } from "@/lib/utils/rate-limit";

export const maxDuration = 120;
export const runtime = "nodejs";

// Server-Sent Events: progres tiap agen + laporan akhir
export async function POST(req: Request) {
  const rl = limited(req, "campaign", 5);
  if (rl) return rl;

  let input: CampaignInput;
  try {
    const f = await req.formData();
    const goal = String(f.get("goal") ?? "").trim();
    if (goal.length < 5) return Response.json({ error: "Tulis tujuan promo minimal 5 karakter." }, { status: 400 });
    const lang = LanguageConfigSchema.parse({ ...DEFAULT_LANG, ...JSON.parse(String(f.get("languageConfig") ?? "{}")) });
    const csv = f.get("csvRows");
    const file = f.get("photo");
    let photoBase64: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) return Response.json({ error: "Ukuran foto maksimal 5MB." }, { status: 400 });
      photoBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    }
    input = {
      id: randomUUID(),
      goal: goal.slice(0, 500),
      languageConfig: lang,
      businessHint: String(f.get("businessHint") ?? "") || undefined,
      csvRows: typeof csv === "string" && csv ? normalizeRows(JSON.parse(csv)) : undefined,
      photoBase64,
    };
  } catch (e) {
    console.error("[campaign/run]", e);
    return Response.json({ error: friendlyError(e) }, { status: 400 });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const emit = (e: AgentEvent) => send({ type: "event", ...e });
      try {
        const graph = buildGraph();
        const out = await graph.invoke({ input }, { configurable: { emit } });
        let report = out.report;
        if (report) {
          // Simpan ke Supabase bila tersedia (poster dipindah ke Storage)
          if (supabaseConfigured()) {
            try {
              if (report.design?.posters) {
                const posters = await Promise.all(
                  report.design.posters.map(async (p, i) => {
                    const url = p.url?.startsWith("data:") ? await uploadPoster(p.url, `${report!.id}-${i}`) : null;
                    return url ? { ...p, url } : p;
                  })
                );
                report = { ...report, design: { ...report.design, posters, posterUrl: posters.find((p) => p.url)?.url ?? report.design.posterUrl } };
              }
              const sb = getServerClient();
              const { data } = (await sb?.auth.getUser()) ?? { data: { user: null } };
              if (sb && data.user) {
                await sb.from("campaigns").insert({ id: report.id, user_id: data.user.id, goal: report.goal, status: report.status, report, language_config: report.languageConfig });
              }
            } catch { /* simpan gagal: laporan tetap dikirim ke client */ }
          }
          send({ type: "done", report });
        } else {
          send({ type: "error", message: "Laporan gagal dibuat." });
        }
      } catch (e) {
        send({ type: "error", message: friendlyError(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
