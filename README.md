# promo. | PromoAgent AI

Sistem orkestrasi kampanye UMKM berbasis Agentic AI. Tulis satu kalimat tujuan promo, unggah foto produk, dan agen AI menyiapkan jadwal posting, caption multi-bahasa, naskah video, dan poster.

## Arsitektur

```
UI (Next.js) -> POST /api/campaign/run (SSE)
   -> LangGraph: supervisor -> timing -> [copywriter || designer] -> compiler
   -> laporan kampanye (localStorage / Supabase)
```

- Supervisor: memecah goal jadi 4 tugas (Groq, structured output Zod)
- Data Agent: hitung pola transaksi (TypeScript murni) + rekomendasi (Groq)
- Copywriter: caption WA/IG + naskah video, mendukung `LanguageConfig` (single / mixed / bilingual / multi_variant)
- Designer: Remove.bg -> latar Pollinations.ai -> komposit `sharp`
- Compiler: menyatukan hasil, membuat jadwal & checklist

## Setup

```bash
npm install
cp .env.example .env.local   # isi GROQ_API_KEY (wajib)
npm run dev                   # http://localhost:3000
```

| Variabel | Fungsi |
|---|---|
| `GROQ_API_KEY` | WAJIB. Dapatkan di console.groq.com/keys |
| `REMOVEBG_API_KEY` | Opsional. Tanpa ini foto asli dipakai di poster |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Opsional. Tanpa ini aplikasi jalan di MODE DEMO (data di browser) |

**Jangan commit `.env.local` dan jangan tempel API key di chat atau kode.**

## Supabase (opsional)

1. Buat proyek, jalankan `supabase/schema.sql` di SQL Editor.
2. Aktifkan provider Google di Authentication bila ingin login Google.
3. Isi tiga variabel Supabase di `.env.local`.

## Deploy ke Vercel

1. Push ke GitHub, import di Vercel.
2. Isi environment variables di Project Settings.
3. `maxDuration` sudah diatur di route (campaign 120 dtk, designer 60 dtk). Plan Hobby membatasi durasi; naikkan plan jika poster sering timeout.

## Catatan

- Nama model Groq ada di `lib/ai/models.ts`; cek `console.groq.com/docs/models` jika berubah.
- Rate limit bersifat in-memory per instance; gunakan Upstash/Redis untuk produksi.
- Komponen di `components/ui/kit.tsx` adalah versi ringan; boleh diganti Shadcn UI via `npx shadcn@latest add`.
- Bahasa berlabel BETA (Jawa, Sunda, Mandarin, Jepang, Korea, Arab) kualitasnya bervariasi.

## Poster multi-konsep (Visual Studio)

Alur: `Concept Agent (Groq) -> 3 konsep (template + palet + teks + prompt latar) -> render paralel -> galeri`.

- Template layout: `lib/image/templates.ts` (6 layout, dirender Satori + font di `assets/fonts`)
- Katalog template & palet: `lib/image/catalog.ts` (tambah palet baru di sini)
- Penempelan produk (trim, bayangan, kartu foto): `lib/image/product.ts`
- Komposisi akhir: `lib/image/compose.ts`
- Concept Agent + pipeline: `lib/agents/designer-agent.ts`
- Endpoint: `POST /api/agents/posters` (SSE) dan `POST /api/agents/posters/render` (render ulang satu poster)

Catatan: huruf poster hanya Latin (font DM Serif Display, Inter, Space Mono). Bahasa non-Latin dialihkan ke bahasa Latin terdekat.

## Poster dari prompt (Visual Studio, dinamis)

Pengguna cukup menulis prompt bebas ("poster promo kopi susu diskon 20% untuk anak kampus, nuansa hangat"). Alur:

`Prompt -> Groq (brief + N DesignSpec: layout, font, warna hex, dekorasi, badge, teks, prompt latar) -> subjek (foto upload atau foto produk AI) -> remove.bg -> latar AI/gradien -> renderer dinamis -> galeri`

- Katalog layout/font/dekorasi: `lib/image/design-catalog.ts`
- Renderer dinamis (zona teks anti-tabrakan, ukuran font diukur pakai metrik glyph asli, kontras otomatis + scrim): `lib/image/dynamic.ts`
- Font (16 file WOFF Latin, OFL): `lib/image/fonts.ts`, `assets/fonts`
- Remove.bg: `lib/image/removeBg.ts` (type hint product/person, fallback otomatis ke ukuran `preview` gratis saat kredit habis lalu masker diperbesar ke resolusi asli, cache, cek hasil kosong). Tanpa key, foto produk AI dipotong dengan penghapus latar putih bawaan.
- Agent + pipeline: `lib/agents/prompt-poster-agent.ts`
- Endpoint: `POST /api/agents/prompt-posters` (SSE) dan `POST /api/agents/prompt-posters/render` (render ulang setelah diedit, tidak memanggil remove.bg lagi)

Setelah update jalankan `npm install` (dependensi baru: `opentype.js`, `@ai-sdk/google`).

LLM untuk desainer poster diatur di `lib/ai/provider.ts`: Gemini (`GOOGLE_GENERATIVE_AI_API_KEY`, model `GEMINI_MODEL`, default `gemini-2.5-flash`) dipakai dulu, Groq jadi cadangan otomatis jika Gemini gagal/kuota habis. Urutan bisa diubah dengan `AI_PROVIDER`.
