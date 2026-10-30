// Katalog murni (aman diimpor client): id template, palet warna, dan metadata
export const TEMPLATE_IDS = ["bold_diskon", "scrapbook", "minimal", "diagonal", "polaroid", "ticket"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEMPLATE_META: { id: TemplateId; label: string; fits: string }[] = [
  { id: "bold_diskon", label: "Bold Diskon", fits: "Blok warna tebal + lingkaran diskon besar. Cocok flash sale, cuci gudang, promo agresif." },
  { id: "scrapbook", label: "Editorial Scrapbook", fits: "Playful, stabilo pink, sticker, bingkai putus-putus. Cocok kuliner, kopi, fashion muda, kreatif." },
  { id: "minimal", label: "Minimal Elegan", fits: "Bersih dan lega. Cocok produk premium, skincare, kerajinan, fashion elegan." },
  { id: "diagonal", label: "Diagonal Dinamis", fits: "Blok diagonal berenergi. Cocok olahraga, otomotif, launching, produk energik." },
  { id: "polaroid", label: "Polaroid", fits: "Foto dalam bingkai polaroid dengan pita. Cocok handmade, hampers, oleh-oleh, produk personal." },
  { id: "ticket", label: "Kupon Tiket", fits: "Banner kupon/tiket di bawah. Cocok voucher, promo gajian, paket bundling, diskon bertahap." },
];

export const PALETTE_IDS = ["pastel_scrapbook", "hangat_kopi", "ramadan", "neon_malam", "segar_hijau", "merah_promo", "monokrom_elegan", "biru_laut"] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export type Palette = {
  id: PaletteId; label: string;
  paper: string;      // warna permukaan terang / teks di atas gelap
  ink: string;        // teks gelap / blok gelap
  primary: string;    // warna utama
  onPrimary: string;  // teks di atas primary
  accent: string; soft: string;
  bg1: string; bg2: string; // gradien latar cadangan
};

export const PALETTES: Record<PaletteId, Palette> = {
  pastel_scrapbook: { id: "pastel_scrapbook", label: "Pastel Scrapbook", paper: "#FBF8F3", ink: "#1A1A1A", primary: "#F9C6D6", onPrimary: "#1A1A1A", accent: "#BFE3EE", soft: "#B5CE8A", bg1: "#FBF8F3", bg2: "#F9C6D6" },
  hangat_kopi: { id: "hangat_kopi", label: "Hangat Kopi", paper: "#FFF4E6", ink: "#2B1A12", primary: "#C8763A", onPrimary: "#FFF4E6", accent: "#F5C16C", soft: "#8B5A2B", bg1: "#F3DFC1", bg2: "#C8763A" },
  ramadan: { id: "ramadan", label: "Ramadan", paper: "#FFF8E7", ink: "#0F3D2E", primary: "#14644A", onPrimary: "#FFF8E7", accent: "#E6B84F", soft: "#D9ECE0", bg1: "#0F3D2E", bg2: "#1C7A5A" },
  neon_malam: { id: "neon_malam", label: "Neon Malam", paper: "#F5F3FF", ink: "#0B0A1A", primary: "#7B2FF7", onPrimary: "#FFFFFF", accent: "#00E5FF", soft: "#FF3CAC", bg1: "#0B0A1A", bg2: "#3A0CA3" },
  segar_hijau: { id: "segar_hijau", label: "Segar Hijau", paper: "#F7FBEF", ink: "#1D3B1A", primary: "#5FA34A", onPrimary: "#FFFFFF", accent: "#F7D54A", soft: "#DDEFC9", bg1: "#DDEFC9", bg2: "#5FA34A" },
  merah_promo: { id: "merah_promo", label: "Merah Promo", paper: "#FFF7F0", ink: "#1A1A1A", primary: "#E63946", onPrimary: "#FFFFFF", accent: "#FFD23F", soft: "#FFE1DC", bg1: "#FFE1DC", bg2: "#E63946" },
  monokrom_elegan: { id: "monokrom_elegan", label: "Monokrom Elegan", paper: "#F4F1EC", ink: "#111111", primary: "#1F1F1F", onPrimary: "#F4F1EC", accent: "#C9A66B", soft: "#D8D3CA", bg1: "#D8D3CA", bg2: "#8A8478" },
  biru_laut: { id: "biru_laut", label: "Biru Laut", paper: "#F2FAFD", ink: "#0B2A3C", primary: "#1E88C8", onPrimary: "#FFFFFF", accent: "#FFD166", soft: "#CBEAF6", bg1: "#CBEAF6", bg2: "#1E88C8" },
};

export const templateLabel = (id: string) => TEMPLATE_META.find((t) => t.id === id)?.label ?? id;
