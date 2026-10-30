// Retry dengan exponential backoff (maks 2x ulang)
export async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseMs = 600): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw lastErr;
}

export function friendlyError(e: unknown): string {
  console.error("[friendlyError] error asli:", e);   // <- tambahkan ini
  const msg = e instanceof Error ? e.message : String(e);
  if (/NO_AI_KEY/.test(msg)) return "Belum ada API key AI. Isi GOOGLE_GENERATIVE_AI_API_KEY atau GROQ_API_KEY di .env.local.";
  if (/GROQ_API_KEY/i.test(msg)) return "GROQ_API_KEY belum diisi di .env.local.";
  // note: plain /rate/ also matched "generated", which hid schema errors behind a rate-limit message
  if (/\b429\b|rate.?limit|too many requests|quota|resource_exhausted/i.test(msg)) return "Server AI sedang ramai atau kuota habis. Coba lagi sebentar lagi ya.";
  if (/no object generated|did not match schema|could not parse/i.test(msg)) return "Jawaban AI tidak lengkap/formatnya salah. Coba lagi ya.";
  if (/401|api key|unauthorized/i.test(msg)) return "API key belum benar. Cek file .env.local kamu.";
  return "Ada kendala saat memproses. Coba lagi ya.";
}
