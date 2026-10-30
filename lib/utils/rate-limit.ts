// Rate limit sederhana in-memory (per instance). Untuk produksi, ganti dengan Upstash/Redis.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}

export function limited(req: Request, scope: string, max = 20): Response | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimit(`${scope}:${ip}`, max)) return null;
  return Response.json({ error: "Terlalu banyak permintaan. Tunggu semenit ya." }, { status: 429 });
}
