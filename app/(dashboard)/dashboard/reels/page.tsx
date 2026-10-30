"use client";
import { useEffect, useState } from "react";
import { PageTitle, PillButton, Sticker } from "@/components/brand";
import { CopyButton, Dots, Empty, ErrorNote, Field, Tabs } from "@/components/ui/kit";
import { LanguagePicker } from "@/components/dashboard/LanguagePicker";
import { SceneTimeline, sceneText } from "@/components/dashboard/parts";
import { useCopy } from "@/components/dashboard/useCopy";
import { DEFAULT_LANG, type LanguageConfig, type ReelsScript } from "@/lib/agents/schemas";
import { download } from "@/lib/utils/ics";
import { getProfile } from "@/lib/utils/client-store";

export default function ReelsPage() {
  const [script, setScript] = useState<ReelsScript | null>(null);
  const [produk, setProduk] = useState("");
  const [goal, setGoal] = useState("");
  const [durasi, setDurasi] = useState(20);
  const [lang, setLang] = useState<LanguageConfig>(DEFAULT_LANG);
  const [tele, setTele] = useState(false);
  const { loading, error, run } = useCopy();

  useEffect(() => {
    const p = getProfile(); if (p) setLang(p.bahasaDefault);
    try { const s = JSON.parse(localStorage.getItem("pa_reels") ?? "null"); if (s?.script) { setScript(s.script); setProduk(s.form?.produk ?? ""); setGoal(s.form?.goal ?? ""); } } catch { /* abaikan */ }
  }, []);

  useEffect(() => {
    if (!tele) return;
    const t = setInterval(() => window.scrollBy(0, 1), 30);
    return () => clearInterval(t);
  }, [tele]);

  async function gen() {
    const r = await run({ goal: goal || `Promo ${produk}`, produk, target: "pelanggan umum", penawaran: "promo spesial", durasi }, lang);
    if (r) setScript(r.variants[0].reelsScript);
  }

  if (tele && script) return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink p-6 text-cream" role="dialog" aria-label="Mode teleprompter">
      <button className="btn-pill sticky top-0 text-ink" onClick={() => setTele(false)}><span className="dot" />Tutup</button>
      <div className="mx-auto max-w-2xl space-y-10 py-[40vh] text-center font-display text-4xl leading-snug">{script.scenes.map((s, i) => <p key={i}>{s.narasi || s.teksLayar}</p>)}<p>{script.cta}</p></div>
    </div>
  );

  return (
    <div>
      <PageTitle title="reels blueprint" sticker="Naskah per detik" sub="Susun naskah video 15-30 detik lengkap dengan instruksi visual." />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Produk"><input className="field" value={produk} onChange={(e) => setProduk(e.target.value)} placeholder="Kopi susu gula aren" /></Field>
        <Field label="Tujuan promo"><input className="field" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Cuci gudang untuk anak kampus" /></Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] uppercase">Durasi</span><Tabs value={String(durasi)} onChange={(x) => setDurasi(Number(x))} tabs={[15, 20, 30].map((d) => ({ id: String(d), label: `${d} dtk` }))} /></div>
      <div className="mt-3"><LanguagePicker value={lang} onChange={setLang} /></div>
      <div className="mt-3"><PillButton variant="pink" disabled={loading || !produk.trim()} onClick={gen}>{loading ? "Menulis..." : "Buat Naskah"}</PillButton></div>
      {loading && <div className="mt-3"><Dots /></div>}
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <div className="mt-6">
        {!script ? <Empty emoji="🎬" title="belum ada naskah" text="Buat naskah baru atau kirim dari Copywriter Studio." /> : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2"><Sticker tone="pink">{script.durasiDetik} detik</Sticker><span className="text-sm">Hook: {script.hook}</span></div>
            <SceneTimeline scenes={script.scenes} onChange={(scenes) => setScript({ ...script, scenes })} />
            <p className="text-sm"><b>CTA:</b> {script.cta} · <b>Musik:</b> {script.musikSaran}</p>
            <div className="flex flex-wrap gap-2"><CopyButton text={sceneText(script.scenes)} label="Salin naskah" /><button className="btn-pill min-h-[36px] px-3 text-xs" onClick={() => download("naskah-video.txt", sceneText(script.scenes))}>Unduh .txt</button><button className="btn-pill min-h-[36px] px-3 text-xs" onClick={() => setTele(true)}>Mode Teleprompter</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
