import "server-only";
import { createGroq } from "@ai-sdk/groq";

// Key hanya dibaca di server. JANGAN import file ini dari komponen client.
export function getGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY belum diisi");
  return createGroq({ apiKey });
}
