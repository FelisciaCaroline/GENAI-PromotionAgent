"use client";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { BrandCard, Disco, Highlight, PillButton, Sticker, Logo } from "@/components/brand";
import { Tabs } from "@/components/ui/kit";

export function Problem() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center">
      <Sticker tone="pink" rotate={2}>⚡ Selamat datang di promo.</Sticker>
      <h2 className="mt-4 font-display text-3xl lowercase md:text-5xl">Buat pemilik UMKM yang kewalahan, bingung strategi, dan kehabisan waktu.</h2>
      <p className="mx-auto mt-4 max-w-xl text-sm text-ink/70">Kamu sudah sibuk melayani pelanggan. Biar promo.-lah yang memikirkan kapan posting, apa yang ditulis, dan seperti apa posternya.</p>
    </section>
  );
}

const FEATURES = [
  { t: "Agentic Campaign Orchestrator", d: "Tulis satu kalimat dan unggah foto. Supervisor AI memecahnya jadi 4 tugas dan membagi ke agen khusus.", tone: "pink" as const, cta: "Buat Kampanye", href: "/login" },
  { t: "Data-Driven Timing Optimizer", d: "Baca data transaksimu lalu tentukan hari dan jam terbaik, misalnya Jumat jam 16:00.", tone: "blue" as const, cta: "Lihat Contoh", href: "#showcase" },
  { t: "Localized Copywriter & Reels Blueprint", d: "Caption WhatsApp/IG dan naskah video 15-30 detik dalam bahasa dan gaya pilihanmu.", tone: "green" as const, cta: "Pilih Bahasa", href: "#bahasa" },
  { t: "AI Visual Studio", d: "Hapus background foto produk, taruh di latar estetis, lengkap dengan teks diskon.", tone: "pink" as const, cta: "Lihat Hasil", href: "#showcase" },
];

export function FeatureCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  return (
    <section id="fitur" className="relative mx-auto max-w-6xl px-4 pb-16">
      <div className="mb-4 flex justify-end gap-2">
        <button aria-label="Geser kiri" onClick={() => scroll(-1)} className="grid h-11 w-11 place-items-center rounded-full border border-ink bg-cream hover:bg-blush"><ChevronLeft size={18} /></button>
        <button aria-label="Geser kanan" onClick={() => scroll(1)} className="grid h-11 w-11 place-items-center rounded-full border border-ink bg-cream hover:bg-blush"><ChevronRight size={18} /></button>
      </div>
      <div ref={ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
        {FEATURES.map((f, i) => (
          <BrandCard key={f.t} tone={f.tone} className="flex min-h-[300px] w-72 flex-none snap-start flex-col justify-between">
            <div>
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-full border border-ink bg-cream text-2xl" aria-hidden>{["🧠", "🕒", "✍️", "🎨"][i]}</div>
              <h3 className="font-display text-2xl leading-tight">{f.t}</h3>
              <p className="mt-2 text-sm text-ink/75">{f.d}</p>
            </div>
            <div className="mt-4"><PillButton href={f.href} className="text-xs">{f.cta}</PillButton></div>
          </BrandCard>
        ))}
      </div>
      <div className="mt-4"><Sticker tone="blue">Fitur favorit UMKM</Sticker></div>
    </section>
  );
}

const STEPS = [
  { t: "Tulis tujuan promo", d: "Satu kalimat saja. Contoh: cuci gudang kopi susu untuk anak kampus." },
  { t: "Upload foto produk", d: "Foto dari HP tidak apa-apa. Background-nya kami urus." },
  { t: "Agen AI bekerja", d: "Supervisor membagi tugas ke Data Agent, Copywriter, dan Designer." },
  { t: "Terima paket kampanye", d: "Jadwal posting, caption, naskah video, dan poster siap pakai." },
];

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="bg-grid border-y border-ink/20 px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-3xl lowercase md:text-5xl">cara <Highlight>kerjanya</Highlight></h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t}><BrandCard tone={(["pink", "blue", "green", "white"] as const)[i]} className="h-full">
              <div className="font-mono text-xs">Langkah {i + 1}</div>
              <h3 className="mt-1 font-display text-xl">{s.t}</h3>
              <p className="mt-1 text-sm text-ink/75">{s.d}</p>
            </BrandCard></li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-wider">
          <Sticker tone="pink">Supervisor</Sticker>→<div className="flex flex-col gap-1"><Sticker tone="blue">Data Agent</Sticker><Sticker tone="green">Copywriter</Sticker><Sticker tone="blue">Designer</Sticker></div>→<Sticker tone="pink">Compiler</Sticker>
        </div>
      </div>
    </section>
  );
}

export function Showcase() {
  const [tab, setTab] = useState("wa");
  return (
    <section id="showcase" className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2">
      <div>
        <Sticker tone="green">Hasil nyata</Sticker>
        <h2 className="mt-3 font-display text-3xl lowercase md:text-5xl">semua yang kamu butuh, <Highlight>satu laporan</Highlight>.</h2>
        <p className="mt-3 text-sm text-ink/70">Lihat contoh hasil kampanye kopi susu untuk anak kampus. Salin, unduh, lalu sebar.</p>
        <div className="mt-4"><PillButton href="/login" variant="pink">Bikin Punyaku</PillButton></div>
      </div>
      <div className="relative">
        <Disco className="absolute -right-2 -top-6" />
        <BrandCard tone="white" className="shadow-[4px_4px_0_#1A1A1A]">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: "wa", label: "WhatsApp" }, { id: "tt", label: "TikTok" }, { id: "po", label: "Poster" }, { id: "jd", label: "Jadwal" }]} />
          <div className="mt-4 min-h-[190px] text-sm">
            {tab === "wa" && <div className="max-w-xs rounded-lg rounded-tl-none bg-[#DCF8C6] p-3">Guys, kopi susu gula aren diskon 20% sampai Minggu! Lagi nugas? Ini penyelamat. Pesan sekarang ☕</div>}
            {tab === "tt" && <ul className="space-y-2"><li className="rounded-lg bg-blush/60 p-2">[Detik 1-3: Zoom in ke gelas kopi, Teks Layar: "Lagi pusing nugas?"]</li><li className="rounded-lg bg-sky-soft/70 p-2">[Detik 4-12: Tuang susu pelan, Teks Layar: "Diskon 20%"]</li><li className="rounded-lg bg-sage/60 p-2">[Detik 13-18: Produk + CTA, Teks Layar: "Pesan sekarang!"]</li></ul>}
            {tab === "po" && <div className="grid aspect-[4/3] place-items-center rounded-lg bg-gradient-to-br from-blush to-sky-soft text-center"><div><div className="font-display text-4xl">20%</div><div className="font-mono text-xs uppercase">Cuci gudang kopi susu</div></div></div>}
            {tab === "jd" && <ul className="space-y-2 font-mono text-xs"><li>Kamis 16:00 · TikTok teaser</li><li>Jumat 15:00 · Poster di Instagram</li><li className="font-bold">Jumat 16:00 · Broadcast WhatsApp (waktu emas)</li></ul>}
          </div>
        </BrandCard>
      </div>
    </section>
  );
}

const DEMOS: { id: string; label: string; text: string }[] = [
  { id: "idjv", label: "Indonesia + Jawa", text: "Rek, kopi susune diskon 20% lho! Ayo cepetan pesen, mumpung stoke isih akeh." },
  { id: "iden", label: "Indonesia + Inggris", text: "Guys, our kopi susu lagi diskon 20%! Perfect buat begadang nugas, order now ya." },
  { id: "en", label: "English", text: "Iced palm sugar milk coffee, 20% off this week only. Treat yourself!" },
  { id: "ko", label: "한국어 (beta)", text: "이번 주만 팜슈가 밀크커피 20% 할인! 지금 주문하세요." },
  { id: "su", label: "Sunda", text: "Mangga teh, kopi susu diskon 20% euy! Hatur nuhun parantos mampir." },
];

export function LanguageDemo() {
  const [id, setId] = useState("idjv");
  const cur = DEMOS.find((d) => d.id === id)!;
  return (
    <section id="bahasa" className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h2 className="font-display text-3xl lowercase md:text-5xl">bahasa <Highlight>apa saja</Highlight>, bahkan dicampur.</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-ink/70">Pilih satu bahasa, campur dua bahasa, atau minta versi terpisah per bahasa. Harga dan angka diskon tetap sama.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {DEMOS.map((d) => <button key={d.id} onClick={() => setId(d.id)} className={`min-h-[40px] rounded-full border border-ink px-4 text-sm ${id === d.id ? "bg-blush" : "bg-cream hover:bg-sky-soft"}`}>{d.label}</button>)}
      </div>
      <BrandCard tone="white" className="mx-auto mt-6 max-w-xl text-left"><p aria-live="polite">{cur.text}</p></BrandCard>
    </section>
  );
}

const MEMBERS = [
  { n: "Bu Sari", u: "Warung Kopi Sari, Malang", q: "Dulu bingung mau posting jam berapa. Sekarang tinggal tulis satu kalimat." },
  { n: "Dimas", u: "Kedai Senja, Surabaya", q: "Caption Jawa medoknya pas banget, pelanggan sampai komentar." },
  { n: "Mei", u: "Mei Craft, Bandung", q: "Poster dari foto HP ternyata bisa sebagus ini." },
  { n: "Andre", u: "Bali Brew, Denpasar", q: "Versi Inggris dan Indonesia langsung jadi untuk turis." },
];

export function Members() {
  return (
    <section className="bg-grid-pink border-y border-ink/20 px-4 py-14">
      <h2 className="text-center font-display text-3xl lowercase">kenalan sama UMKM kami</h2>
      <div className="mx-auto mt-6 flex max-w-6xl snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
        {MEMBERS.map((m) => (
          <div key={m.n} className="w-64 flex-none snap-start rounded-xl border border-ink/40 bg-white p-4 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sky-soft font-display text-2xl">{m.n[0]}</div>
            <div className="mt-2 font-semibold">{m.n}</div>
            <div className="text-xs text-ink/60">{m.u}</div>
            <p className="mt-2 text-sm">{m.q}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const PLANS = [
  { n: "Gratis", p: "Rp 0", tone: "blue" as const, f: ["10 kampanye pertama", "1 bahasa per kampanye", "Poster 1:1"] },
  { n: "Pro", p: "Rp 79.000/bln", tone: "pink" as const, hot: true, f: ["Kampanye tanpa batas", "Campur & multi-bahasa", "Semua rasio poster", "Unduh paket .zip"] },
  { n: "Bisnis", p: "Rp 199.000/bln", tone: "green" as const, f: ["Banyak akun usaha", "Brand tone khusus", "Prioritas dukungan"] },
];

export function Pricing() {
  return (
    <section id="harga" className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="text-center font-display text-3xl lowercase md:text-5xl">harga yang <Highlight>ramah kantong</Highlight></h2>
      <p className="mt-2 text-center text-xs text-ink/50">Harga contoh untuk demo.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <BrandCard key={p.n} tone={p.tone} className="relative">
            {p.hot && <Sticker tone="white" className="absolute -top-3 right-4">Paling populer</Sticker>}
            <h3 className="font-display text-2xl">{p.n}</h3>
            <div className="mt-1 text-lg font-semibold">{p.p}</div>
            <ul className="mt-3 space-y-1 text-sm">{p.f.map((x) => <li key={x}>✓ {x}</li>)}</ul>
            <div className="mt-5"><PillButton href="/login">Pilih {p.n}</PillButton></div>
          </BrandCard>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  ["Apakah saya perlu paham desain atau marketing?", "Tidak. Cukup tulis tujuan promomu dalam satu kalimat."],
  ["Bahasa apa saja yang didukung?", "Indonesia, Inggris, Jawa, Sunda, Melayu, Mandarin, Jepang, Korea, Arab, Spanyol, Prancis, Jerman, Portugis, Hindi, dan Thai. Beberapa bahasa berlabel beta."],
  ["Apakah data transaksi saya aman?", "Data hanya dipakai untuk analisis waktu promo milikmu dan dilindungi akses per akun."],
  ["Bagaimana cara kerja hapus background?", "Foto dikirim ke layanan pemotong background, lalu produk ditempel di latar yang dibuat AI."],
  ["Apakah hasilnya menjamin penjualan naik?", "Tidak ada jaminan. Kami membantu promomu tampil rapi dan tepat waktu."],
  ["Bisa dipakai lewat HP?", "Bisa. Seluruh tampilan dibuat mobile-first."],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 pb-16">
      <h2 className="mb-6 text-center font-display text-3xl lowercase md:text-5xl">pertanyaan umum</h2>
      <div className="space-y-2">
        {FAQS.map(([q, a], i) => (
          <div key={q} className="rounded-xl border border-ink bg-white">
            <button className="flex min-h-[48px] w-full items-center justify-between px-4 text-left font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              {q}<Plus size={18} className={open === i ? "rotate-45 transition" : "transition"} />
            </button>
            {open === i && <p className="px-4 pb-4 text-sm text-ink/75">{a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-sage px-4 py-16 text-center">
      <h2 className="font-display text-4xl lowercase md:text-6xl">siap bikin promo tanpa pusing?</h2>
      <div className="mt-6"><PillButton href="/login" variant="pink">Mulai Gratis</PillButton></div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-grid px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <Logo />
        <nav className="flex gap-5 font-mono text-[11px] tracking-widest"><a href="#fitur">FITUR</a><a href="#harga">HARGA</a><a href="#faq">FAQ</a><a href="/login">MASUK</a></nav>
        <p className="text-sm">Dibuat dengan 💗 untuk UMKM Indonesia</p>
      </div>
    </footer>
  );
}
