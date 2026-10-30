import { NextResponse } from "next/server";
import { renderPoster, type Product } from "@/lib/agents/designer-agent";
import { PosterConceptInputSchema } from "@/lib/agents/schemas";
import { normalizePhoto } from "@/lib/image/product";
import type { Ratio } from "@/lib/image/compose";
import { friendlyError } from "@/lib/utils/retry";
import { limited } from "@/lib/utils/rate-limit";

export const maxDuration = 60;
export const runtime = "nodejs";

// Render ulang SATU poster (ubah teks, template, palet, atau latar baru)
export async function POST(req: Request) {
  const rl = limited(req, "poster-render", 20);
  if (rl) return rl;
  try {
    const f = await req.formData();
    const concept = PosterConceptInputSchema.parse(JSON.parse(String(f.get("concept") ?? "{}")));
    const ratio = (["1:1", "4:5", "9:16"].includes(String(f.get("ratio"))) ? String(f.get("ratio")) : "4:5") as Ratio;
    const bgMode = String(f.get("bgMode")) === "solid" ? "solid" : "ai";

    // Pakai hasil hapus-background yang sudah ada agar tidak memanggil Remove.bg lagi
    const cutoutUrl = String(f.get("cutout") ?? "");
    const file = f.get("photo");
    let product: Product = { cutout: null, photo: null };
    if (cutoutUrl.startsWith("data:image/png;base64,")) {
      const photo = file instanceof File && file.size > 0 ? await normalizePhoto(Buffer.from(await file.arrayBuffer())) : null;
      product = { cutout: Buffer.from(cutoutUrl.split(",")[1], "base64"), photo };
    } else if (file instanceof File && file.size > 0) {
      const photo = await normalizePhoto(Buffer.from(await file.arrayBuffer()));
      product = { cutout: null, photo };
    }
    const r = await renderPoster({ concept, ratio, bgMode, product });
    return NextResponse.json({ url: r.url, bgFallback: r.bgFallback });
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 500 });
  }
}
