export type StyleDef = { id: string; label: string; guide: string; example: string };

// Gaya bahasa + contoh few-shot singkat (referensi nada, bukan untuk disalin)
export const STYLES: StyleDef[] = [
  { id: "gaul_jakarta", label: "Gaul Jakarta", guide: "santai, lo-gue, singkatan gaul, energik", example: "Guys, kopi susu lagi diskon gila-gilaan nih! Buruan sebelum abis, gak nyesel deh." },
  { id: "jawa_medok", label: "Jawa medok (Jatim)", guide: "campuran Jawa Timuran yang akrab: rek, lho, ayo, pokoke", example: "Rek, kopi susune lagi diskon lho! Ayo cepetan dipesen, mumpung stoke isih akeh." },
  { id: "sunda", label: "Sunda", guide: "ramah khas Sunda: mangga, hatur nuhun, euy, teh/akang", example: "Mangga teh, kopi susu diskon euy! Hatur nuhun parantos mampir." },
  { id: "anak_kampus", label: "Anak Kampus", guide: "relate dengan tugas, deadline, uang saku, hemat", example: "Lagi nugas sampai begadang? Kopi susu diskon, uang saku aman, skripsi lancar." },
  { id: "formal", label: "Formal Profesional", guide: "sopan, jelas, profesional, tanpa slang", example: "Dengan hormat, kami menghadirkan penawaran spesial untuk produk kopi susu pilihan." },
  { id: "ibu_ibu", label: "Ibu-ibu Komplek", guide: "hangat, akrab, menyapa bunda/ibu, fokus hemat dan keluarga", example: "Bunda, ada promo kopi susu nih buat teman arisan. Hemat, enak, anak-anak juga suka." },
  { id: "turis_friendly", label: "Ramah Turis", guide: "sederhana, jelas, hangat, mudah dipahami penutur non-native", example: "Try our local iced coffee, sweet and creamy. Special price this week only!" },
];

export const styleOf = (id: string) => STYLES.find((s) => s.id === id) ?? STYLES[0];
