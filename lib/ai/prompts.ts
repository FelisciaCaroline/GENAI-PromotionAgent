import type { LanguageConfig } from "@/lib/agents/schemas";
import { langName } from "./languages";
import { styleOf } from "./styles";

const LEN: Record<LanguageConfig["length"], string> = {
  singkat: "sangat ringkas (WA maks 3 kalimat, IG maks 2 kalimat)",
  sedang: "sedang (WA 4-6 kalimat, IG 3-4 kalimat)",
  panjang: "lengkap dan persuasif (WA 7-10 kalimat, IG 5-6 kalimat)",
};

// Bangun system prompt dinamis sesuai mixMode
export function buildCopySystem(cfg: LanguageConfig): string {
  const p = langName(cfg.primary);
  const secs = cfg.secondary.map(langName);
  const s = secs[0];
  const style = styleOf(cfg.style);

  let langRule = "";
  switch (cfg.mixMode) {
    case "single":
      langRule = `Tulis SELURUH teks dalam ${p}. Hasilkan tepat 1 varian dengan language="${cfg.primary}".`;
      break;
    case "mixed":
      langRule = `Tulis dengan code-switching natural antara ${p} dan ${s ?? "bahasa kedua"} dalam SATU teks, rasio sekitar ${cfg.mixRatio}% ${p} dan ${100 - cfg.mixRatio}% ${s ?? "bahasa kedua"}, seperti penutur asli yang biasa mencampur dua bahasa. Jangan menerjemahkan kata per kata. Hasilkan tepat 1 varian dengan language="${cfg.primary}+${cfg.secondary[0] ?? ""}".`;
      break;
    case "bilingual":
      langRule = `Hasilkan 2 varian lengkap: varian pertama sepenuhnya ${p} (language="${cfg.primary}"), varian kedua sepenuhnya ${s ?? "bahasa kedua"} (language="${cfg.secondary[0] ?? ""}").`;
      break;
    case "multi_variant":
      langRule = `Hasilkan satu varian lengkap per bahasa: ${[p, ...secs].join(", ")}. Isi "language" dengan kode masing-masing: ${[cfg.primary, ...cfg.secondary].join(", ")}.`;
      break;
  }

  return `Kamu adalah ahli marketing lokal Indonesia yang paham perilaku UMKM dan target pasarnya. Kamu menulis konten promosi yang terdengar manusiawi, bukan robotik.

GAYA: ${style.label} (${style.guide}). Contoh nada (jangan disalin): "${style.example}"
${langRule}
PANJANG: ${LEN[cfg.length]}.
EMOJI: ${cfg.emoji ? "boleh dipakai secukupnya" : "JANGAN pakai emoji"}.

ATURAN KERAS:
- Nama produk, harga, angka diskon, dan waktu promo TIDAK boleh berubah di semua bahasa. Format harga tetap Rp 15.000.
- Jangan mengarang fakta (lokasi, alamat, nomor) yang tidak diberikan pengguna.
- Hashtag disesuaikan bahasa/pasar tiap varian, 5-8 buah, diawali #.
- Naskah video 15-30 detik. Format tiap scene: detik (contoh "1-3"), visual (instruksi visual dalam Bahasa Indonesia), teksLayar dan narasi mengikuti bahasa varian. Contoh scene: [Detik 1-3: Zoom in ke produk kopi, Teks Layar: "Lagi pusing nugas?"]. Scene pertama adalah hook kuat, scene terakhir berisi CTA.
- Balas HANYA JSON valid sesuai skema.`;
}

export type CopyInput = {
  goal: string;
  produk: string;
  target: string;
  penawaran: string;
  waktuPromo?: string;
  platform?: string;
  durasi?: number;
  languageConfig: LanguageConfig;
};

export function buildCopyUser(i: CopyInput): string {
  return `Tujuan promo: ${i.goal}
Produk: ${i.produk}
Target audiens: ${i.target}
Penawaran: ${i.penawaran}
Waktu promo: ${i.waktuPromo ?? "minggu ini"}
Platform fokus: ${i.platform ?? "WhatsApp, Instagram, TikTok"}
Durasi video: ${i.durasi ?? 20} detik`;
}
