import "server-only";
import { generateObject, streamObject } from "ai";
import { getGroq } from "@/lib/ai/groq";
import { MODELS } from "@/lib/ai/models";
import { buildCopySystem, buildCopyUser, type CopyInput } from "@/lib/ai/prompts";
import { withRetry } from "@/lib/utils/retry";
import { CopyResultSchema, type CopyResult } from "./schemas";

export async function runCopywriter(input: CopyInput): Promise<CopyResult> {
  const { object } = await withRetry(() =>
    generateObject({
      model: getGroq()(MODELS.smart),
      mode: "json",
      schema: CopyResultSchema,
      system: buildCopySystem(input.languageConfig),
      prompt: buildCopyUser(input),
      temperature: 0.8,
    })
  );
  return object;
}

export function streamCopywriter(input: CopyInput) {
  return streamObject({
    model: getGroq()(MODELS.smart),
    mode: "json",
    schema: CopyResultSchema,
    system: buildCopySystem(input.languageConfig),
    prompt: buildCopyUser(input),
    temperature: 0.8,
  });
}
