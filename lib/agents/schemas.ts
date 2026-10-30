import { z } from "zod";
import { PALETTE_IDS, TEMPLATE_IDS } from "@/lib/image/catalog";

export const LanguageConfigSchema = z.object({
  primary: z.string(),
  secondary: z.array(z.string()).max(2),
  mixMode: z.enum(["single", "mixed", "bilingual", "multi_variant"]),
  mixRatio: z.number().min(30).max(90),
  style: z.string(),
  emoji: z.boolean(),
  length: z.enum(["singkat", "sedang", "panjang"]),
});
export type LanguageConfig = z.infer<typeof LanguageConfigSchema>;

export const DEFAULT_LANG: LanguageConfig = {
  primary: "id",
  secondary: [],
  mixMode: "single",
  mixRatio: 70,
  style: "gaul_jakarta",
  emoji: true,
  length: "sedang",
};

export const SceneSchema = z.object({
  detik: z.string().describe("Rentang detik, contoh: 1-3"),
  visual: z.string().describe("Instruksi visual dalam Bahasa Indonesia"),
  teksLayar: z.string(),
  narasi: z.string(),
});
export type Scene = z.infer<typeof SceneSchema>;

export const ReelsScriptSchema = z.object({
  durasiDetik: z.number(),
  hook: z.string(),
  scenes: z.array(SceneSchema),
  cta: z.string(),
  musikSaran: z.string(),
});
export type ReelsScript = z.infer<typeof ReelsScriptSchema>;

export const VariantSchema = z.object({
  language: z.string().describe("Kode bahasa varian, contoh: id, en, atau id+en untuk campuran"),
  whatsappBroadcast: z.string(),
  instagramCaption: z.string(),
  hashtags: z.array(z.string()),
  reelsScript: ReelsScriptSchema,
});
export type Variant = z.infer<typeof VariantSchema>;

export const CopyResultSchema = z.object({ variants: z.array(VariantSchema) });
export type CopyResult = z.infer<typeof CopyResultSchema>;

export const PlanSchema = z.object({
  produk: z.string(),
  tujuan: z.string().describe("cuci gudang, launching, promo gajian, dll"),
  targetAudiens: z.string(),
  penawaran: z.string().describe("perkiraan diskon/penawaran, contoh: Diskon 20%"),
  periodeWaktu: z.string(),
  gayaBahasaSaran: z.string().describe("salah satu id gaya: gaul_jakarta, jawa_medok, sunda, anak_kampus, formal, ibu_ibu, turis_friendly"),
  languageSuggestion: z.object({
    primary: z.string(),
    secondary: z.array(z.string()),
    mixMode: z.enum(["single", "mixed", "bilingual", "multi_variant"]),
    alasan: z.string(),
  }),
  headline: z.string().describe("Headline poster maksimal 5 kata"),
  tasks: z.array(z.string()),
});
export type Plan = z.infer<typeof PlanSchema>;

export const TimingRowSchema = z.object({
  tanggal: z.string(),
  jam: z.string(),
  produk: z.string(),
  qty: z.number(),
  total_harga: z.number(),
});
export type TimingRow = z.infer<typeof TimingRowSchema>;

export type TimingAnalysis = {
  total: number;
  omzet: number;
  byDay: { day: string; count: number; omzet: number }[];
  byHour: { hour: number; count: number }[];
  heatmap: number[][]; // [hari 0=Senin..6=Minggu][jam 0..23]
  topProducts: { produk: string; qty: number }[];
  best: { day: string; hour: number; count: number };
};

export const TimingRecommendationSchema = z.object({
  bestDay: z.string(),
  bestHour: z.string().describe("format HH:mm"),
  secondBest: z.string(),
  reasoning: z.string(),
  avoidTimes: z.string(),
  confidence: z.number(),
});
export type TimingRecommendation = z.infer<typeof TimingRecommendationSchema>;

export type TimingResult = { analysis: TimingAnalysis; recommendation: TimingRecommendation };

export const ConceptSchema = z.object({
  templateId: z.enum(TEMPLATE_IDS),
  paletteId: z.enum(PALETTE_IDS),
  headline: z.string().describe("Maksimal 5 kata"),
  subheadline: z.string().describe("Maksimal 12 kata"),
  discount: z.string().describe("Maksimal 8 karakter, contoh: 20%, Rp 15K, 2 FREE 1"),
  cta: z.string().describe("Maksimal 3 kata"),
  badge: z.string().describe("Label pendek, maksimal 3 kata"),
  bgPrompt: z.string().describe("Prompt gambar latar dalam bahasa Inggris"),
  mood: z.string(),
  alasan: z.string().describe("Alasan singkat memilih konsep ini, Bahasa Indonesia"),
});
export const ConceptsResultSchema = z.object({
  kategori: z.string().describe("Kategori produk, contoh: kopi, kuliner, fashion"),
  musiman: z.string().describe("Momen musiman jika ada (Ramadan, gajian, tahun ajaran baru), atau 'tidak ada'"),
  concepts: z.array(ConceptSchema).min(3).max(4),
});
export type PosterConcept = z.infer<typeof ConceptSchema> & { seed: number };
export type ConceptsResult = z.infer<typeof ConceptsResultSchema>;
export const PosterConceptInputSchema = ConceptSchema.extend({ seed: z.number() });

export type PosterItem = { concept: PosterConcept; url: string | null; error?: string };

export type DesignResult = {
  posterUrl: string | null;
  cutoutUsed: boolean;
  bgPrompt: string;
  note?: string;
  kategori?: string;
  musiman?: string;
  posters?: PosterItem[];
};

export type ScheduleSlot = { channel: string; datetime: string; label: string };

export type CampaignReport = {
  id: string;
  goal: string;
  createdAt: string;
  status: "selesai" | "parsial" | "gagal";
  languageConfig: LanguageConfig;
  plan: Plan | null;
  timing: TimingResult | null;
  copy: CopyResult | null;
  design: DesignResult | null;
  summary: string;
  schedule: ScheduleSlot[];
  checklist: string[];
  impact: string;
  errors: string[];
};

export type AgentName = "supervisor" | "timing" | "copywriter" | "designer" | "compiler";
export type AgentEvent = { agent: AgentName; status: "pending" | "running" | "done" | "error"; message: string };
