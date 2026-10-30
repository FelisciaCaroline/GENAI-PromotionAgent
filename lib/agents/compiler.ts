import { addDays, setHours, setMinutes, startOfDay } from "date-fns";
import {
  type CampaignReport, type CopyResult, type DesignResult, type LanguageConfig,
  type Plan, type ScheduleSlot, type TimingResult,
} from "./schemas";

const DAY_INDEX: Record<string, number> = { Minggu: 0, Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6 };

function nextDate(dayName: string, hhmm: string): Date {
  const target = DAY_INDEX[dayName] ?? 5;
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10) || 0);
  let d = startOfDay(addDays(new Date(), 1));
  while (d.getDay() !== target) d = addDays(d, 1);
  return setMinutes(setHours(d, h), m);
}

// Compiler: murni TypeScript, menggabungkan hasil sub-agen
export function compileReport(p: {
  id: string; goal: string; languageConfig: LanguageConfig;
  plan: Plan | null; timing: TimingResult | null; copy: CopyResult | null; design: DesignResult | null; errors: string[];
}): CampaignReport {
  const schedule: ScheduleSlot[] = [];
  if (p.timing) {
    const best = nextDate(p.timing.recommendation.bestDay, p.timing.recommendation.bestHour);
    schedule.push(
      { channel: "TikTok", datetime: addDays(best, -1).toISOString(), label: "Upload video teaser (1 hari sebelum puncak)" },
      { channel: "Instagram", datetime: new Date(best.getTime() - 60 * 60_000).toISOString(), label: "Posting poster + caption" },
      { channel: "WhatsApp", datetime: best.toISOString(), label: "Kirim broadcast di waktu emas" },
      { channel: "WhatsApp", datetime: addDays(best, 1).toISOString(), label: "Broadcast pengingat (promo segera berakhir)" },
    );
  }

  const checklist = [
    "Cek stok produk promo sebelum disebar",
    p.design?.posterUrl ? "Unduh poster dan simpan di galeri HP" : "Siapkan foto produk terbaik untuk poster",
    p.copy ? "Salin caption WhatsApp ke daftar broadcast" : "Tulis caption promo",
    p.copy ? "Rekam video sesuai naskah, lalu upload ke TikTok/Reels" : "Siapkan konten video",
    p.timing ? `Atur pengingat posting: ${p.timing.recommendation.bestDay} ${p.timing.recommendation.bestHour}` : "Tentukan jam posting terbaik",
    "Balas chat pelanggan dalam 15 menit selama promo berlangsung",
    "Catat jumlah penjualan selama promo untuk evaluasi",
  ];

  const status: CampaignReport["status"] = !p.copy && !p.design && !p.timing ? "gagal" : p.errors.length ? "parsial" : "selesai";

  return {
    id: p.id,
    goal: p.goal,
    createdAt: new Date().toISOString(),
    status,
    languageConfig: p.languageConfig,
    plan: p.plan,
    timing: p.timing,
    copy: p.copy,
    design: p.design,
    summary: p.plan
      ? `Kampanye ${p.plan.tujuan} untuk ${p.plan.produk}, menyasar ${p.plan.targetAudiens}. Penawaran: ${p.plan.penawaran}. Periode: ${p.plan.periodeWaktu}.`
      : p.goal,
    schedule,
    checklist,
    // Estimasi kualitatif, tanpa angka penjualan palsu
    impact: "Promo yang disebar di jam ramai dengan visual dan caption yang konsisten biasanya lebih mudah dilihat pelanggan. Hasil nyata tergantung stok, harga, dan respons audiens, jadi catat penjualanmu sebagai bahan evaluasi.",
    errors: p.errors,
  };
}
