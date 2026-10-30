export type LangStatus = "stabil" | "beta";
export type Language = { code: string; nama: string; namaAsli: string; bendera: string; status: LangStatus };

export const LANGUAGES: Language[] = [
  { code: "id", nama: "Indonesia", namaAsli: "Bahasa Indonesia", bendera: "🇮🇩", status: "stabil" },
  { code: "en", nama: "Inggris", namaAsli: "English", bendera: "🇬🇧", status: "stabil" },
  { code: "jv", nama: "Jawa", namaAsli: "Basa Jawa", bendera: "🌾", status: "beta" },
  { code: "su", nama: "Sunda", namaAsli: "Basa Sunda", bendera: "🌿", status: "beta" },
  { code: "ms", nama: "Melayu", namaAsli: "Bahasa Melayu", bendera: "🇲🇾", status: "stabil" },
  { code: "zh", nama: "Mandarin", namaAsli: "中文", bendera: "🇨🇳", status: "beta" },
  { code: "ja", nama: "Jepang", namaAsli: "日本語", bendera: "🇯🇵", status: "beta" },
  { code: "ko", nama: "Korea", namaAsli: "한국어", bendera: "🇰🇷", status: "beta" },
  { code: "ar", nama: "Arab", namaAsli: "العربية", bendera: "🇸🇦", status: "beta" },
  { code: "es", nama: "Spanyol", namaAsli: "Español", bendera: "🇪🇸", status: "stabil" },
  { code: "fr", nama: "Prancis", namaAsli: "Français", bendera: "🇫🇷", status: "stabil" },
  { code: "de", nama: "Jerman", namaAsli: "Deutsch", bendera: "🇩🇪", status: "stabil" },
  { code: "pt", nama: "Portugis", namaAsli: "Português", bendera: "🇵🇹", status: "stabil" },
  { code: "hi", nama: "Hindi", namaAsli: "हिन्दी", bendera: "🇮🇳", status: "stabil" },
  { code: "th", nama: "Thai", namaAsli: "ไทย", bendera: "🇹🇭", status: "stabil" },
];

export const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.namaAsli ?? code;
export const langLabel = (code: string) => {
  const l = LANGUAGES.find((x) => x.code === code);
  return l ? `${l.bendera} ${l.nama}` : code;
};

export const MIX_MODES = [
  { id: "single", label: "Satu bahasa", hint: "Seluruh teks dalam satu bahasa" },
  { id: "mixed", label: "Campur", hint: "Dua bahasa dalam satu teks (code-switching)" },
  { id: "bilingual", label: "Dua bahasa", hint: "Dua versi lengkap, utama lalu kedua" },
  { id: "multi_variant", label: "Per bahasa", hint: "Satu versi lengkap per bahasa" },
] as const;
