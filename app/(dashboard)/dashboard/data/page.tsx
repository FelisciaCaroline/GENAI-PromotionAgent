"use client";
import Papa from "papaparse";
import { useEffect, useRef, useState } from "react";
import { BrandCard, PageTitle, PillButton } from "@/components/brand";
import { Empty, ErrorNote } from "@/components/ui/kit";
import { deleteUpload, getUploads, saveUpload, type CsvUpload } from "@/lib/utils/client-store";

export default function DataPage() {
  const [list, setList] = useState<CsvUpload[]>([]);
  const [sel, setSel] = useState<CsvUpload | null>(null);
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const refresh = () => { const l = getUploads(); setList(l); setSel((s) => l.find((x) => x.id === s?.id) ?? l[0] ?? null); };
  useEffect(refresh, []);

  function onFile(f?: File) {
    if (!f) return;
    Papa.parse<Record<string, string>>(f, { header: true, skipEmptyLines: true, complete: (o) => {
      const miss = ["tanggal", "jam", "produk", "qty", "total_harga"].filter((c) => !o.meta.fields?.includes(c));
      if (miss.length) return setError(`Kolom belum ada: ${miss.join(", ")}`);
      setError(""); saveUpload({ id: crypto.randomUUID(), fileName: f.name, rows: o.data, createdAt: new Date().toISOString() }); refresh();
    } });
  }

  return (
    <div>
      <PageTitle title="data transaksi" sticker="CSV milikmu" sub="Kelola file transaksi yang dipakai untuk mencari waktu promo terbaik." />
      <div className="flex flex-wrap gap-2"><PillButton variant="pink" onClick={() => ref.current?.click()}>Unggah CSV</PillButton><a className="btn-pill" href="/template-transaksi.csv" download><span className="dot" />Unduh template</a></div>
      <input ref={ref} type="file" accept=".csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <BrandCard tone="blue" className="mt-4 text-sm"><b>Format kolom:</b> <code>tanggal</code> (YYYY-MM-DD), <code>jam</code> (HH:mm), <code>produk</code>, <code>qty</code> (angka), <code>total_harga</code> (angka).</BrandCard>
      <div className="mt-4">
        {list.length === 0 ? <Empty emoji="📊" title="belum ada file" text="Unggah CSV transaksimu atau pakai template untuk mencoba." /> : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">{list.map((u) => <span key={u.id} className={`flex items-center gap-2 rounded-full border border-ink px-3 py-1 text-sm ${sel?.id === u.id ? "bg-blush" : "bg-cream"}`}><button onClick={() => setSel(u)}>{u.fileName} ({u.rows.length})</button><button aria-label={`Hapus ${u.fileName}`} onClick={() => { if (confirm("Hapus file ini?")) { deleteUpload(u.id); refresh(); } }}>✕</button></span>)}</div>
            {sel && <div className="overflow-x-auto rounded-xl border border-ink bg-white"><table className="w-full text-left text-xs"><thead className="bg-blush"><tr>{["tanggal", "jam", "produk", "qty", "total_harga"].map((h) => <th key={h} className="p-2 font-mono uppercase">{h}</th>)}</tr></thead><tbody>{sel.rows.slice(0, 10).map((r, i) => <tr key={i} className="border-t border-ink/10">{["tanggal", "jam", "produk", "qty", "total_harga"].map((h) => <td key={h} className="p-2">{r[h]}</td>)}</tr>)}</tbody></table></div>}
          </div>
        )}
      </div>
    </div>
  );
}
