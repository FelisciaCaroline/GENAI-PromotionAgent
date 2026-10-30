"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { PageTitle, PillButton } from "@/components/brand";
import { ErrorNote } from "@/components/ui/kit";
import { AgentWorkspace } from "@/components/dashboard/parts";
import { LanguagePicker, normalizeLang } from "@/components/dashboard/LanguagePicker";
import { DEFAULT_LANG, type AgentEvent, type AgentName, type LanguageConfig } from "@/lib/agents/schemas";
import { getProfile, getUploads, saveCampaign } from "@/lib/utils/client-store";

const CHIPS = ["Cuci gudang stok kopi susu minggu depan untuk anak kampus", "Launching menu baru: matcha latte", "Promo gajian akhir bulan untuk karyawan kantor"];
const FOREIGN = /turis|tourist|bule|wisatawan|luar negeri|ekspor|expat/i;

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const [goal, setGoal] = useState(params.get("goal") ?? "");
  const [lang, setLang] = useState<LanguageConfig>(DEFAULT_LANG);
  const [useSample, setUseSample] = useState(true);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Partial<Record<AgentName, AgentEvent["status"]>>>({});
  const [log, setLog] = useState<AgentEvent[]>([]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const hasUpload = typeof window !== "undefined" && getUploads().length > 0;

  useEffect(() => { const p = getProfile(); if (p) setLang(p.bahasaDefault); }, []);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("File harus berupa gambar.");
    if (f.size > 5 * 1024 * 1024) return setError("Ukuran foto maksimal 5MB.");
    setError(""); setPhoto(f); setPreview(URL.createObjectURL(f));
  }

  async function run() {
    if (goal.trim().length < 5) return setError("Tulis tujuan promo dulu ya (minimal 5 karakter).");
    setError(""); setRunning(true); setStatus({}); setLog([]);
    const fd = new FormData();
    fd.append("goal", goal);
    fd.append("languageConfig", JSON.stringify(normalizeLang(lang)));
    const p = getProfile();
    if (p) fd.append("businessHint", `${p.namaUsaha}, ${p.jenisUsaha}, ${p.kota}`);
    if (!useSample && hasUpload) fd.append("csvRows", JSON.stringify(getUploads()[0].rows));
    if (photo) fd.append("photo", photo);
    try {
      const res = await fetch("/api/campaign/run", { method: "POST", body: fd });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.error ?? "Gagal memulai agen.");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";
        for (const c of chunks) {
          if (!c.startsWith("data: ")) continue;
          const m = JSON.parse(c.slice(6));
          if (m.type === "event") { setStatus((s) => ({ ...s, [m.agent]: m.status })); setLog((l) => [...l, m]); }
          if (m.type === "error") throw new Error(m.message);
          if (m.type === "done") { saveCampaign(m.report); router.push(`/dashboard/campaign/${m.report.id}`); return; }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kendala.");
      setRunning(false);
    }
  }

  return (
    <div>
      <PageTitle title="buat kampanye" sticker="Fitur inti" sub="Satu kalimat, satu foto. Sisanya dikerjakan Supervisor dan tiga agen." />
      {!running ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <div>
              <label htmlFor="goal" className="font-mono text-[11px] uppercase tracking-wider">Tujuan promo</label>
              <textarea id="goal" rows={5} className="field mt-1 text-lg" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Saya mau cuci gudang stok kopi susu minggu depan untuk anak kampus" />
              <div className="mt-2 flex flex-wrap gap-2">{CHIPS.map((c) => <button key={c} className="rounded-full border border-ink bg-cream px-3 py-1.5 text-xs hover:bg-blush" onClick={() => setGoal(c)}>{c.split(" ").slice(0, 4).join(" ")}...</button>)}</div>
              {FOREIGN.test(goal) && lang.primary === "id" && lang.secondary.length === 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-ink bg-sky-soft/60 p-3 text-sm">
                  Target kamu tampaknya wisatawan asing. Pakai Indonesia + Inggris?
                  <button className="btn-pill min-h-[36px] text-xs" onClick={() => setLang({ ...lang, mixMode: "bilingual", secondary: ["en"] })}>Terapkan saran</button>
                </div>
              )}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
              className="grid min-h-[200px] place-items-center rounded-xl border-2 border-dashed border-ink bg-white p-3 text-center text-sm hover:bg-blush/30" aria-label="Unggah foto produk">
              {preview ? <img src={preview} alt="Foto produk" className="max-h-48 rounded-lg object-contain" /> : <div><ImagePlus className="mx-auto" /><p className="mt-1">Tarik foto produk ke sini atau ketuk untuk memilih</p><p className="text-xs text-ink/60">Maks 5MB</p></div>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </div>
          <LanguagePicker value={lang} onChange={setLang} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[#F4A6BF]" checked={useSample || !hasUpload} disabled={!hasUpload} onChange={(e) => setUseSample(e.target.checked)} />Pakai data transaksi contoh {!hasUpload && <span className="text-xs text-ink/60">(unggah CSV di tab Data Transaksi untuk memakai datamu)</span>}</label>
          {error && <ErrorNote>{error}</ErrorNote>}
          <PillButton variant="pink" onClick={run} className="text-base">Jalankan Agen AI ✨</PillButton>
        </div>
      ) : (
        <div className="space-y-3"><AgentWorkspace status={status} log={log} />{error && <ErrorNote>{error}</ErrorNote>}</div>
      )}
    </div>
  );
}

export default function Page() { return <Suspense><Inner /></Suspense>; }
