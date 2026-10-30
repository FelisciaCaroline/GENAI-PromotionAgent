import { NextResponse } from "next/server";
import { parseClientSpec, renderPromptPoster } from "@/lib/agents/prompt-poster-agent";
import type { Ratio } from "@/lib/image/compose";
import type { ProductAsset } from "@/lib/image/dynamic";
import { normalizePhoto } from "@/lib/image/product";
import { friendlyError } from "@/lib/utils/retry";
import { limited } from "@/lib/utils/rate-limit";

export const maxDuration = 60;
export const runtime = "nodejs";

// Re-render ONE poster after edits. Reuses the existing cutout so remove.bg is not called again.
export async function POST(req: Request) {
  const rl = limited(req, "prompt-poster-render", 30);
  if (rl) return rl;
  try {
    const f = await req.formData();
    const spec = parseClientSpec(JSON.parse(String(f.get("spec") ?? "{}")));
    const ratio = (["1:1", "4:5", "9:16"].includes(String(f.get("ratio"))) ? String(f.get("ratio")) : "4:5") as Ratio;
    const cutoutUrl = String(f.get("cutout") ?? "");
    const file = f.get("photo");
    const asset: ProductAsset = { cutout: null, photo: null };
    if (cutoutUrl.startsWith("data:image/png;base64,")) asset.cutout = Buffer.from(cutoutUrl.split(",")[1], "base64");
    else if (file instanceof File && file.size > 0) asset.photo = await normalizePhoto(Buffer.from(await file.arrayBuffer()));
    const r = await renderPromptPoster(spec, ratio, asset);
    return NextResponse.json({ url: r.url, bgFallback: r.bgFallback, spec });
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 500 });
  }
}
