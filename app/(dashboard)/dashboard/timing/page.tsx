"use client";
import Papa from "papaparse";
import { useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BrandCard, PageTitle, PillButton, Sticker } from "@/components/brand";
import { Dots, Empty, ErrorNote } from "@/components/ui/kit";
import { Heatmap } from "@/components/dashboard/parts";
import type { TimingResult } from "@/lib/agents/schemas";
import { getUploads, saveUpload } from "@/lib/utils/client-store";

const REQUIRED = ["tanggal", "jam", "produk", "qty", "total_harga"];

export default function TimingPage() {
  const [res, setRes] = useState<TimingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyze(rows?: Record<string, string>[]) {
    setLoading(true); setError(""); setRes(null); setSaved(false);
    try {
      const r = await fetch("/api/agents/timing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRes(j);
    } catch (e) { setError(e instanceof Error ? e.message : "Analisis gagal."); }
    setLoading(false);
  }

  function onFile(f?: File) {
    if (!f) return;
    Papa.parse<Record<string, string>>(f, {
      header: true, skipEmptyLines: true,
      complete: (out) => {
        const miss = REQUIRED.filter((c) => !out.meta.fields?.includes(c));
        if (miss.length) return setError(`Kolom belum ada: ${miss.join(", ")}. Unduh template di tab Data Transaksi.`);
        saveUpload({ id: crypto.randomUUID(), fileName: f.name, rows: out.data, createdAt: new Date().toISOString() });
        analyze(out.data);
      },
    });
  }

  const rec = res?.recommendation;
  return (
    <div>
      <PageTitle title="timing optimizer" sticker="Waktu emas promo" sub="Cari hari dan jam terbaik berdasarkan pola transaksi tokomu." />
      <div className="flex flex-wrap gap-2">
        <PillButton variant="pink" onClick={() => analyze()} disabled={loading}>Pakai data contoh</PillButton>
        {getUploads()[0] && <PillButton onClick={() => analyze(getUploads()[0].rows)} disabled={loading}>Pakai CSV terakhir</PillButton>}
        <PillButton onClick={() => fileRef.current?.click()} disabled={loading}>Unggah CSV</PillButton>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      {loading && <div className="mt-6 flex items-center gap-2 text-sm"><Dots />Menganalisis transaksi...</div>}
      {!res && !loading && <div className="mt-6"><Empty emoji="📈" title="belum ada analisis" text="Pilih data contoh atau unggah CSV transaksimu untuk melihat waktu terbaik." /></div>}
      {res && rec && (
        <div className="mt-6 space-y-4">
          <BrandCard tone="pink" className="relative">
            <Sticker tone="white" className="absolute -top-3 right-4">Waktu emas</Sticker>
            <div className="font-display text-4xl">📅 {rec.bestDay} · ⏰ {rec.bestHour}</div>
            <p className="mt-2 text-sm">{rec.reasoning}</p>
            <p className="mt-1 text-sm"><b>Alternatif:</b> {rec.secondBest} · <b>Hindari:</b> {rec.avoidTimes} · <b>Keyakinan:</b> {Math.round(rec.confidence)}%</p>
            <div className="mt-3"><PillButton onClick={() => { localStorage.setItem("pa_golden", JSON.stringify(rec)); setSaved(true); }}>{saved ? "Tersimpan ✓" : "Tambah ke jadwal kampanye"}</PillButton></div>
          </BrandCard>
          <div className="grid gap-4 md:grid-cols-2">
            <BrandCard tone="white"><h3 className="mb-2 font-display text-xl">Transaksi per hari</h3><div className="h-56"><ResponsiveContainer><BarChart data={res.analysis.byDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="count" fill="#F4A6BF" stroke="#1A1A1A" name="Transaksi" /></BarChart></ResponsiveContainer></div></BrandCard>
            <BrandCard tone="white"><h3 className="mb-2 font-display text-xl">Transaksi per jam</h3><div className="h-56"><ResponsiveContainer><LineChart data={res.analysis.byHour.filter((h) => h.hour >= 6 && h.hour <= 22)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Line dataKey="count" stroke="#1A1A1A" strokeWidth={2} dot={false} name="Transaksi" /></LineChart></ResponsiveContainer></div></BrandCard>
          </div>
          <BrandCard tone="white"><h3 className="mb-2 font-display text-xl">Heatmap hari x jam</h3><Heatmap a={res.analysis} /></BrandCard>
          <BrandCard tone="blue"><h3 className="font-display text-xl">Produk terlaris</h3><ul className="mt-1 text-sm">{res.analysis.topProducts.map((p) => <li key={p.produk}>{p.produk}: {p.qty} terjual</li>)}</ul></BrandCard>
        </div>
      )}
    </div>
  );
}
