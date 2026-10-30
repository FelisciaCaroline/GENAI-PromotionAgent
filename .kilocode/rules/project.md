# PROJECT: PromoAgent AI – Sistem Orkestrasi Kampanye UMKM Terpadu

## Ringkasan
Asisten pemasaran all-in-one berbasis Agentic AI untuk UMKM Indonesia. Pengguna menulis SATU kalimat
tujuan promo dan mengunggah foto produk. Sistem memecahnya jadi 4 tugas (Timing, Copywriting,
Video Script, Design) lalu menyusun laporan kampanye di dashboard.

## Tech Stack (WAJIB, jangan ganti)
Next.js 14 App Router + TypeScript + Tailwind, Vercel AI SDK (`ai`, `@ai-sdk/groq`),
LangGraph.js (`@langchain/langgraph`), Zod, Supabase (opsional / mode demo), Remove.bg,
Pollinations.ai, sharp, papaparse, recharts, framer-motion, lucide-react.

## Environment (jangan hardcode, jangan commit)
GROQ_API_KEY, REMOVEBG_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY. Semua panggilan Groq HANYA dari server (`lib/ai/groq.ts` memakai `server-only`).

## Model Groq: lihat `lib/ai/models.ts` (satu-satunya tempat nama model).

## Arsitektur
UI -> POST /api/campaign/run (SSE) -> LangGraph (`lib/agents/graph.ts`):
START -> supervisor -> timing -> [copywriter || designer] -> compiler -> END.
Kegagalan satu node tidak menghentikan graph; hasil parsial tetap dikompilasi.

## Konvensi
- UI Bahasa Indonesia santai; OUTPUT caption mengikuti `LanguageConfig` (primary, secondary, mixMode, mixRatio, style).
- Angka, harga, nama produk tidak boleh berubah antar bahasa.
- Strict TypeScript, tanpa `any`. Output agen divalidasi Zod (`lib/agents/schemas.ts`).
- Mobile-first. Komentar kode Bahasa Indonesia singkat. Kerjakan per modul kecil.

## DESIGN SYSTEM "Playful Editorial Scrapbook" (referensi: Pretty Little Marketer)
- Background krem `#FBF8F3` + grid tipis (`.bg-grid`). Aksen: pink `#F9C6D6`/`#F4A6BF`, biru `#BFE3EE`, hijau sage `#B5CE8A`, teks `#1A1A1A`.
- Heading: serif display (DM Serif Display), lowercase, kata kunci diberi stabilo pink (`.highlight-pink`).
- Body Inter; label kecil monospace uppercase (`.sticker`).
- Tombol pill border hitam dengan titik pink (`.btn-pill`). Navbar kotak border hitam. Kartu rounded-xl border tipis, warna bergantian pink/biru/hijau.
- Dekor: emoji stiker, bola disko, marquee hijau sage, top banner biru border putus-putus, section testimoni pink bergrid.
- Tanpa mode gelap.
