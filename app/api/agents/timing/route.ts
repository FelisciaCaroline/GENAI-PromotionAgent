import { NextResponse } from "next/server";
import { z } from "zod";
import { runDataAgent } from "@/lib/agents/data-agent";
import { loadSampleRows, normalizeRows } from "@/lib/agents/sample-data";
import { friendlyError } from "@/lib/utils/retry";
import { limited } from "@/lib/utils/rate-limit";

export const maxDuration = 30;
const Body = z.object({ rows: z.array(z.record(z.unknown())).optional() });

export async function POST(req: Request) {
  const rl = limited(req, "timing");
  if (rl) return rl;
  try {
    const body = Body.parse(await req.json().catch(() => ({})));
    const rows = body.rows?.length ? normalizeRows(body.rows) : await loadSampleRows();
    if (!rows.length) return NextResponse.json({ error: "Kolom wajib: tanggal, jam, produk, qty, total_harga." }, { status: 400 });
    return NextResponse.json(await runDataAgent(rows));
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 500 });
  }
}
