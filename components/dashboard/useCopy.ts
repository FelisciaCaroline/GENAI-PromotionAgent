"use client";
import { useState } from "react";
import { CopyResultSchema, type CopyResult, type LanguageConfig } from "@/lib/agents/schemas";
import { normalizeLang } from "./LanguagePicker";

export type CopyForm = { goal: string; produk: string; target: string; penawaran: string; waktuPromo?: string; durasi?: number };

// Panggil API copywriter (streaming teks JSON), parse di akhir
export function useCopy() {
  const [data, setData] = useState<CopyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(form: CopyForm, lang: LanguageConfig) {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/agents/copywriter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, languageConfig: normalizeLang(lang) }) });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.error ?? "Gagal membuat teks.");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let txt = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; txt += dec.decode(value, { stream: true }); }
      const parsed = CopyResultSchema.parse(JSON.parse(txt));
      setData(parsed);
      return parsed;
    } catch (e) {
      setError(e instanceof Error && e.message && !/JSON|ZodError|\[/.test(e.message) ? e.message : "Hasil dari AI belum rapi. Coba buat ulang.");
      return null;
    } finally { setLoading(false); }
  }
  return { data, setData, loading, error, run };
}
