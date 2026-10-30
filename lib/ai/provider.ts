import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModelV1 } from "ai";
import { MODELS } from "./models";

export type ProviderName = "google" | "groq";
export type ProviderChoice = { name: ProviderName; label: string; model: LanguageModelV1; providerOptions?: Record<string, Record<string, unknown>> };

// Ordered list of LLM providers for the poster designer. AI_PROVIDER picks the first one;
// any other provider with a key is used as an automatic fallback.
export function designerProviders(): ProviderChoice[] {
  const googleKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY)?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const list: ProviderChoice[] = [];

  if (googleKey) {
    const modelId = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    list.push({
      name: "google",
      label: `Gemini (${modelId})`,
      model: createGoogleGenerativeAI({ apiKey: googleKey })(modelId),
      // keep "thinking" short: faster responses, plenty for a design brief
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 1024 } } },
    });
  }
  if (groqKey) {
    list.push({ name: "groq", label: `Groq (${MODELS.smart})`, model: createGroq({ apiKey: groqKey })(MODELS.smart) });
  }

  const preferred = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (preferred) list.sort((a, b) => (a.name === preferred ? -1 : b.name === preferred ? 1 : 0));
  if (!list.length) throw new Error("NO_AI_KEY: isi GOOGLE_GENERATIVE_AI_API_KEY atau GROQ_API_KEY di .env.local");
  return list;
}
