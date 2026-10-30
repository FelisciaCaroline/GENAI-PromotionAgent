"use client";
import { useEffect, useState } from "react";
import { Disco, Highlight, PillButton, Sticker } from "@/components/brand";

const SAMPLE = "Saya mau cuci gudang stok kopi susu minggu depan untuk anak kampus";

export function Hero() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x >= SAMPLE.length + 25 ? 0 : x + 1)), 70);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="bg-grid relative overflow-hidden px-4 pb-16 pt-14 text-center">
      <span className="absolute left-[12%] top-10 animate-floaty text-3xl" aria-hidden>🍒</span>
      <span className="absolute right-[14%] top-14 animate-floaty text-3xl" aria-hidden>💬</span>
      <Disco className="absolute right-[8%] top-[55%] hidden md:block" />
      <h1 className="mx-auto max-w-4xl font-display text-5xl lowercase leading-[1.05] tracking-tight md:text-8xl">
        <Highlight>satu kalimat</Highlight><br />jadi kampanye<br />promo lengkap.
      </h1>
      <div className="mt-3"><Sticker tone="blue" rotate={-3}>Where promos get simple</Sticker></div>
      <p className="mx-auto mt-6 max-w-xl text-base text-ink/75">
        Asisten AI untuk UMKM: atur jadwal posting, tulis caption dalam bahasa apa saja, bikin naskah TikTok, dan poster produk. Semua otomatis.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <PillButton href="/login" variant="pink">Coba Sekarang</PillButton>
        <PillButton href="#cara-kerja">Lihat Cara Kerja</PillButton>
      </div>
      <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-ink bg-white p-4 text-left shadow-[4px_4px_0_#1A1A1A]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Tujuan promomu</div>
        <p className="mt-1 min-h-[3rem] text-lg">{SAMPLE.slice(0, n)}<span className="animate-pulse">|</span></p>
      </div>
    </section>
  );
}
