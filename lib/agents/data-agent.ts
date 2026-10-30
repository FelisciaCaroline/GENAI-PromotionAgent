import "server-only";
import { generateObject } from "ai";
import { getGroq } from "@/lib/ai/groq";
import { MODELS } from "@/lib/ai/models";
import { withRetry } from "@/lib/utils/retry";
import {
  TimingRecommendationSchema,
  type TimingAnalysis,
  type TimingRecommendation,
  type TimingResult,
  type TimingRow,
} from "./schemas";

export const DAYS_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

// Tool murni (bukan LLM): hitung pola transaksi
export function analyzeTransactions(rows: TimingRow[]): TimingAnalysis {
  const heat = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const dayOmzet = Array<number>(7).fill(0);
  const prod = new Map<string, number>();
  let omzet = 0;

  for (const r of rows) {
    const d = new Date(`${r.tanggal}T00:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    const di = (d.getDay() + 6) % 7; // Senin = 0
    const hi = Math.min(23, Math.max(0, parseInt(r.jam.split(":")[0] ?? "0", 10) || 0));
    heat[di][hi] += 1;
    dayOmzet[di] += r.total_harga;
    omzet += r.total_harga;
    prod.set(r.produk, (prod.get(r.produk) ?? 0) + r.qty);
  }

  const byDay = DAYS_ID.map((day, i) => ({ day, count: heat[i].reduce((a, b) => a + b, 0), omzet: dayOmzet[i] }));
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: heat.reduce((a, row) => a + row[hour], 0) }));
  const topProducts = [...prod.entries()].map(([produk, qty]) => ({ produk, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);

  let best = { day: DAYS_ID[0], hour: 0, count: -1 };
  heat.forEach((row, di) => row.forEach((c, h) => { if (c > best.count) best = { day: DAYS_ID[di], hour: h, count: c }; }));

  return { total: rows.length, omzet, byDay, byHour, heatmap: heat, topProducts, best };
}

function fallbackRecommendation(a: TimingAnalysis): TimingRecommendation {
  const sortedDays = [...a.byDay].sort((x, y) => y.count - x.count);
  const quiet = sortedDays[sortedDays.length - 1];
  return {
    bestDay: a.best.day,
    bestHour: `${String(a.best.hour).padStart(2, "0")}:00`,
    secondBest: `${sortedDays[1]?.day ?? "-"}`,
    reasoning: `Transaksi tertinggi terjadi pada hari ${a.best.day} sekitar jam ${a.best.hour}:00, jadi sebar promo sedikit sebelum waktu itu.`,
    avoidTimes: `Hindari hari ${quiet?.day ?? "-"} yang paling sepi.`,
    confidence: 70,
  };
}

// Data Agent: hitung dengan tool, LLM hanya menyusun rekomendasi bahasa natural
export async function runDataAgent(rows: TimingRow[]): Promise<TimingResult> {
  const analysis = analyzeTransactions(rows);
  if (analysis.total === 0) throw new Error("Data transaksi kosong");
  try {
    const { object } = await withRetry(() =>
      generateObject({
        model: getGroq()(MODELS.smart),
        mode: "json",
        schema: TimingRecommendationSchema,
        system:
          "Kamu analis data untuk UMKM Indonesia. Susun rekomendasi waktu promosi dalam Bahasa Indonesia yang ringkas dan mudah dipahami berdasarkan data yang diberikan. Jangan mengarang angka di luar data. bestHour format HH:mm. confidence 0-100.",
        prompt: `Ringkasan data (${analysis.total} transaksi):
Per hari: ${JSON.stringify(analysis.byDay)}
Per jam (jam dengan transaksi): ${JSON.stringify(analysis.byHour.filter((h) => h.count > 0))}
Puncak: ${analysis.best.day} jam ${analysis.best.hour}:00 (${analysis.best.count} transaksi)
Top produk: ${JSON.stringify(analysis.topProducts)}`,
      })
    );
    return { analysis, recommendation: object };
  } catch {
    return { analysis, recommendation: fallbackRecommendation(analysis) };
  }
}
