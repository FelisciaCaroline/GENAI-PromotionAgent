"use client";
import { useRef, useState } from "react";
import { ImagePlus, Sparkles, X } from "lucide-react";
import { PageTitle, PillButton, Sticker } from "@/components/brand";
import { Dots, Empty, ErrorNote, Field } from "@/components/ui/kit";
import { BeforeAfterSlider } from "@/components/dashboard/parts";
import { cn } from "@/lib/utils/cn";
import {
  BADGE_IDS, BG_IDS, DECOR_IDS, LAYOUT_META, TYPE_IDS, TYPE_PRESETS,
  type DecorId, type DesignSpec, type DesignText,
} from "@/lib/image/design-catalog";

type Slot = { spec: DesignSpec; url: string | null; error?: string };

const LANGS: [string, string][] = [["auto", "Ikuti prompt"], ["id", "Indonesia"], ["en", "Inggris"], ["jv", "Jawa"], ["su", "Sunda"], ["ms", "Melayu"], ["es", "Spanyol"], ["fr", "Prancis"], ["de", "Jerman"], ["pt", "Portugis"]];

const EXAMPLES = [
  "Poster promo kopi susu gula aren diskon 20% khusus anak kampus, berlaku sampai Minggu. Nuansa hangat dan cozy, brand @kopikita",
  "Flash sale sneakers putih edisi terbatas, harga Rp 299.000 dari Rp 450.000, cuma 3 hari. Gaya streetwear yang berani",
  "Poster acara live music jazz di Taman Kota Bandung, Sabtu 8 November jam 19.00, gratis. Vibes malam, elegan",
  "Launching serum vitamin C untuk kulit glowing, kesan premium dan bersih, warna oranye lembut",
];

const BADGE_LABEL: Record<string, string> = { circle: "Lingkaran", burst: "Ledakan", stamp: "Stempel", tag: "Label harga", none: "Tanpa badge" };
const BG_LABEL: Record<string, string> = { ai_scene: "Foto AI", gradient: "Gradien", solid: "Polos" };
const DECOR_LABEL: Record<DecorId, string> = { disc: "Lingkaran", rings: "Cincin", rays: "Sinar", sparkles: "Kilau", blobs: "Blob", dots: "Titik", stripes: "Garis", grid: "Grid", confetti: "Konfeti", waves: "Ombak", frame: "Bingkai" };
const COLOR_LABEL: Record<keyof DesignSpec["colors"], string> = { bg: "Latar", surface: "Kartu", text: "Teks", primary: "Utama", onPrimary: "Teks utama", accent: "Aksen" };

// Compact input styling for the poster editor (fits a phone screen without scrolling)
const MINI = "field h-9 px-2.5 py-1 text-[13px]";
function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-0.5 block truncate text-[10px] uppercase tracking-wider text-ink/60">{label}</span>
      {children}
    </label>
  );
}

export default function VisualPage() {
  const [prompt, setPrompt] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [before, setBefore] = useState("");
  const [opt, setOpt] = useState({ ratio: "4:5", lang: "auto", count: "3", aiSubject: true, bgMode: "auto" });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [sel, setSel] = useState(0);
  const [cutout, setCutout] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ kind: string; subject: string; source: string } | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState(false);
  const [tab, setTab] = useState<"judul" | "info" | "gaya" | "warna">("judul");
  const [zoom, setZoom] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLInputElement>(null);

  function pick(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("File harus berupa gambar.");
    if (file.size > 8 * 1024 * 1024) return setError("Ukuran foto maksimal 8MB.");
    setError(""); setPhoto(file); setBefore(URL.createObjectURL(file));
  }

  async function generate() {
    if (prompt.trim().length < 8) return setError("Ceritakan poster yang kamu mau dulu ya.");
    setError(""); setNotes([]); setRunning(true); setSlots([]); setSel(0); setCutout(null); setMeta(null); setStatus("Memulai...");
    const fd = new FormData();
    fd.append("prompt", prompt);
    if (photo) fd.append("photo", photo);
    fd.append("ratio", opt.ratio); fd.append("lang", opt.lang); fd.append("count", opt.count);
    fd.append("aiSubject", opt.aiSubject ? "1" : "0"); fd.append("bgMode", opt.bgMode);
    try {
      const res = await fetch("/api/agents/prompt-posters", { method: "POST", body: fd });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.error ?? "Gagal memulai.");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const m = JSON.parse(p.slice(6));
          if (m.type === "status") setStatus(m.message);
          if (m.type === "brief") {
            setSlots((m.specs as DesignSpec[]).map((spec) => ({ spec, url: null })));
            setCutout(m.cutout); setMeta({ kind: m.kind, subject: m.subject, source: m.subjectSource }); setNotes(m.notes ?? []);
          }
          if (m.type === "poster") {
            setSlots((s) => s.map((x, i) => (i === m.index ? { ...x, url: m.url, error: m.error } : x)));
            if (m.bgFallback) setNotes((n) => (n.some((x) => x.startsWith("Latar AI")) ? n : [...n, "Latar AI gagal dibuat untuk sebagian poster, dipakai gradien."]));
          }
          if (m.type === "error") throw new Error(m.message);
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal membuat poster."); }
    setRunning(false); setStatus("");
  }

  const cur = slots[sel];
  const patch = (p: Partial<DesignSpec>) => setSlots((s) => s.map((x, i) => (i === sel ? { ...x, spec: { ...x.spec, ...p } } : x)));
  const patchText = (p: Partial<DesignText>) => cur && patch({ text: { ...cur.spec.text, ...p } });
  const patchColor = (k: keyof DesignSpec["colors"], v: string) => cur && patch({ colors: { ...cur.spec.colors, [k]: v.toUpperCase() } });
  const toggleDecor = (d: DecorId) => cur && patch({ decor: cur.spec.decor.includes(d) ? cur.spec.decor.filter((x) => x !== d) : [...cur.spec.decor, d].slice(-3) });

  async function rerender(newSeed = false) {
    if (!cur) return;
    const spec = newSeed ? { ...cur.spec, seed: Math.floor(Math.random() * 900000) + 1 } : cur.spec;
    setBusy(true); setError("");
    const fd = new FormData();
    fd.append("spec", JSON.stringify(spec)); fd.append("ratio", opt.ratio);
    if (cutout) fd.append("cutout", cutout);
    else if (photo) fd.append("photo", photo);
    try {
      const r = await fetch("/api/agents/prompt-posters/render", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setSlots((s) => s.map((x, i) => (i === sel ? { spec: j.spec ?? spec, url: j.url } : x)));
      if (j.bgFallback) setNotes((n) => [...n, "Latar AI gagal dibuat, dipakai gradien."]);
    } catch (e) { setError(e instanceof Error ? e.message : "Render ulang gagal."); }
    setBusy(false);
  }

  const aspect = opt.ratio === "1:1" ? "aspect-square" : opt.ratio === "9:16" ? "aspect-[9/16]" : "aspect-[4/5]";
  const mf = (label: string, k: keyof Omit<DesignText, "details">, max: number) => (
    <Mini label={label}><input className={MINI} maxLength={max} value={cur?.spec.text[k] ?? ""} onChange={(e) => patchText({ [k]: e.target.value } as Partial<DesignText>)} /></Mini>
  );
  // on phones, jump to the editor when a concept is picked
  const choose = (i: number) => {
    setSel(i);
    if (window.matchMedia("(max-width: 767px)").matches) setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div>
      <PageTitle title="visual studio" sticker="Poster dari prompt" sub="Tulis poster seperti apa yang kamu mau. AI menyusun teks, layout, font, warna, dan latar, lalu memotong foto produk dengan remove.bg." />
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Field label="Poster seperti apa?" hint="Sebutkan produk/acara, penawaran, tanggal, target, dan suasana yang diinginkan.">
            <textarea className="field min-h-[150px] resize-y py-3" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={1500}
              placeholder="Contoh: poster promo kopi susu gula aren diskon 20% untuk anak kampus, sampai Minggu, nuansa hangat" />
          </Field>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex, i) => (
              <button key={i} type="button" onClick={() => setPrompt(ex)} className="rounded-full border border-ink/40 bg-white px-3 py-1 text-left text-xs hover:border-ink hover:bg-blush/40">
                {ex.split(",")[0].slice(0, 42)}...
              </button>
            ))}
          </div>

          <div className="relative">
            <button type="button" onClick={() => ref.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
              className="grid min-h-[110px] w-full place-items-center rounded-xl border-2 border-dashed border-ink bg-white p-3 text-center text-sm hover:bg-blush/30">
              {before ? <img src={before} alt="Foto produk" className="max-h-28 rounded-lg" /> : <div><ImagePlus className="mx-auto" /><p>Foto produk (opsional). Background dihapus otomatis.</p></div>}
            </button>
            {photo && <button type="button" aria-label="Hapus foto" onClick={() => { setPhoto(null); setBefore(""); }} className="absolute right-2 top-2 rounded-full border border-ink bg-white p-1"><X size={14} /></button>}
          </div>
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rasio"><select className="field" value={opt.ratio} onChange={(e) => setOpt({ ...opt, ratio: e.target.value })}><option value="1:1">1:1 (feed)</option><option value="4:5">4:5 (IG)</option><option value="9:16">9:16 (story)</option></select></Field>
            <Field label="Bahasa"><select className="field" value={opt.lang} onChange={(e) => setOpt({ ...opt, lang: e.target.value })}>{LANGS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></Field>
            <Field label="Jumlah konsep"><select className="field" value={opt.count} onChange={(e) => setOpt({ ...opt, count: e.target.value })}>{["1", "2", "3", "4"].map((n) => <option key={n}>{n}</option>)}</select></Field>
            <Field label="Latar"><select className="field" value={opt.bgMode} onChange={(e) => setOpt({ ...opt, bgMode: e.target.value })}><option value="auto">AI pilih (foto/gradien)</option><option value="solid">Tanpa foto AI (cepat)</option></select></Field>
          </div>
          {!photo && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={opt.aiSubject} onChange={(e) => setOpt({ ...opt, aiSubject: e.target.checked })} />
              Tanpa foto? Buat foto produk dengan AI lalu potong pakai remove.bg
            </label>
          )}
          <PillButton variant="pink" onClick={generate} disabled={running}>{running ? "AI sedang bekerja..." : <><Sparkles size={16} className="mr-1 inline" />Buat Poster</>}</PillButton>
          {running && status && <p className="flex items-center gap-2 text-xs"><Dots /> {status}</p>}
          {error && <ErrorNote>{error}</ErrorNote>}
        </div>

        <div className="min-w-0">
          {slots.length === 0 ? (
            <Empty emoji="🎨" title={running ? "sedang merancang..." : "belum ada poster"} text="Tulis prompt lalu tekan tombol. Konsep muncul satu per satu (sekitar 20-60 detik)." />
          ) : (
            <div className="space-y-4">
              {meta && (
                <div className="flex flex-wrap gap-2">
                  {meta.subject && <Sticker tone="blue">Subjek: {meta.subject}</Sticker>}
                  <Sticker tone="pink">Jenis: {meta.kind}</Sticker>
                  {meta.source === "ai" && <Sticker tone="green">Foto produk dibuat AI</Sticker>}
                  {cutout && <Sticker tone="cream">remove.bg aktif</Sticker>}
                </div>
              )}
              {notes.length > 0 && <div className="space-y-1 rounded-lg bg-sky-soft/60 p-2 text-xs">{notes.map((n, i) => <p key={i}>{n}</p>)}</div>}

              <div className={cn("grid gap-3", slots.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>
                {slots.map((s, i) => (
                  <button key={i} type="button" onClick={() => choose(i)} aria-pressed={sel === i}
                    className={cn("overflow-hidden rounded-xl border bg-white text-left", sel === i ? "border-2 border-ink shadow-[3px_3px_0_#1A1A1A]" : "border-ink/40 hover:border-ink")}>
                    <div className={cn("relative grid w-full place-items-center bg-sky-soft/50", aspect)}>
                      {s.url ? <img src={s.url} alt={`Konsep ${i + 1}: ${s.spec.text.headline}`} className="h-full w-full object-cover" />
                        : s.error ? <span className="p-2 text-center text-xs">Gagal dirender</span>
                        : <div className="text-center text-xs"><Dots /><div className="mt-2">Merender...</div></div>}
                    </div>
                    <div className="p-2">
                      <div className="truncate font-mono text-[10px] uppercase tracking-wider">{s.spec.name}</div>
                      <div className="mt-1 flex items-center gap-1">{[s.spec.colors.bg, s.spec.colors.primary, s.spec.colors.accent, s.spec.colors.text].map((c, k) => <span key={k} className="h-3 w-3 rounded-full border border-ink/40" style={{ background: c }} />)}</div>
                    </div>
                  </button>
                ))}
              </div>

              {cur && (
                <div ref={editorRef} className="scroll-mt-2 rounded-xl border border-ink bg-white">
                  {/* header: small preview + name + actions */}
                  <div className="flex items-start gap-3 border-b border-ink/15 p-2.5 sm:p-4">
                    <button type="button" onClick={() => cur.url && setZoom(true)} className="w-[64px] shrink-0 sm:w-[160px] md:w-[240px]" aria-label="Perbesar poster">
                      {cur.url ? (compare && before ? <BeforeAfterSlider before={before} after={cur.url} /> : <img src={cur.url} alt="Poster terpilih" className="w-full rounded-md border border-ink" />)
                        : <div className={cn("grid place-items-center rounded-md bg-sky-soft/50", aspect)}><Dots /></div>}
                    </button>
                    <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-3">
                      <div className="truncate font-display text-lg lowercase leading-tight sm:text-2xl">{cur.spec.name}</div>
                      {cur.spec.alasan && <p className="hidden text-sm leading-relaxed text-ink/80 sm:block">{cur.spec.alasan}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {cur.url && <a className="btn-pill min-h-[32px] px-3 text-xs" href={cur.url} download={`poster-${sel + 1}.jpg`}><span className="dot" />Unduh</a>}
                        {cur.url && <button className="btn-pill min-h-[32px] px-3 text-xs" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${cur.spec.text.headline} ${cur.spec.text.highlight}`.trim())}`, "_blank")}>WA</button>}
                        {before && cur.url && <button className="btn-pill min-h-[32px] px-3 text-xs" onClick={() => setCompare(!compare)}>{compare ? "Poster" : "Before/After"}</button>}
                      </div>
                    </div>
                  </div>

                  {/* segmented tabs, one short panel at a time */}
                  <div className="flex border-b border-ink/15 px-2.5 pt-2 sm:px-4" role="tablist">
                    {([["judul", "Judul"], ["info", "Info"], ["gaya", "Gaya"], ["warna", "Warna"]] as const).map(([id, label]) => (
                      <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                        className={cn("-mb-px flex-1 border-b-2 pb-2 font-mono text-[11px] uppercase tracking-wider", tab === id ? "border-ink font-bold" : "border-transparent text-ink/50")}>{label}</button>
                    ))}
                  </div>

                  <div className="space-y-2 p-2.5 sm:space-y-3 sm:p-4">
                    {tab === "judul" && (<>
                      {mf("Headline", "headline", 60)}
                      <Mini label="Subheadline"><textarea className={cn(MINI, "h-auto resize-none py-1.5 leading-snug")} rows={2} maxLength={120} value={cur.spec.text.subheadline} onChange={(e) => patchText({ subheadline: e.target.value })} /></Mini>
                      <div className="grid grid-cols-2 gap-2">{mf("Kata disorot", "emphasis", 30)}{mf("Label atas", "eyebrow", 32)}</div>
                    </>)}

                    {tab === "info" && (<>
                      <div className="grid grid-cols-2 gap-2">{mf("Harga/diskon", "highlight", 14)}{mf("Label harga", "highlightLabel", 14)}</div>
                      <div className="grid grid-cols-2 gap-2">{mf("Tombol CTA", "cta", 26)}{mf("Footer", "footer", 32)}</div>
                      <Mini label="Detail (per baris, maks 3)"><textarea className={cn(MINI, "h-auto resize-none py-1.5 leading-snug")} rows={3} value={cur.spec.text.details.join("\n")} onChange={(e) => patchText({ details: e.target.value.split("\n").slice(0, 3) })} /></Mini>
                    </>)}

                    {tab === "gaya" && (<>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Mini label="Layout"><select className={MINI} value={cur.spec.layout} onChange={(e) => patch({ layout: e.target.value as DesignSpec["layout"] })}>{LAYOUT_META.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></Mini>
                        <Mini label="Font"><select className={MINI} value={cur.spec.typography} onChange={(e) => patch({ typography: e.target.value as DesignSpec["typography"] })}>{TYPE_IDS.map((t) => <option key={t} value={t}>{TYPE_PRESETS[t].label}</option>)}</select></Mini>
                        <Mini label="Huruf"><select className={MINI} value={cur.spec.headingCase} onChange={(e) => patch({ headingCase: e.target.value as DesignSpec["headingCase"] })}><option value="normal">Asli</option><option value="upper">KAPITAL</option><option value="lower">kecil</option><option value="title">Judul</option></select></Mini>
                        <Mini label="Rata"><select className={MINI} value={cur.spec.align} onChange={(e) => patch({ align: e.target.value as DesignSpec["align"] })}><option value="center">Tengah</option><option value="left">Kiri</option></select></Mini>
                        <Mini label="Badge"><select className={MINI} value={cur.spec.badgeShape} onChange={(e) => patch({ badgeShape: e.target.value as DesignSpec["badgeShape"] })}>{BADGE_IDS.map((b) => <option key={b} value={b}>{BADGE_LABEL[b]}</option>)}</select></Mini>
                        <Mini label="Latar"><select className={MINI} value={cur.spec.background} onChange={(e) => patch({ background: e.target.value as DesignSpec["background"] })}>{BG_IDS.map((b) => <option key={b} value={b}>{BG_LABEL[b]}</option>)}</select></Mini>
                        <Mini label="Ukuran produk"><select className={MINI} value={cur.spec.productSize} onChange={(e) => patch({ productSize: e.target.value as DesignSpec["productSize"] })}><option value="small">Kecil</option><option value="medium">Sedang</option><option value="large">Besar</option></select></Mini>
                      </div>
                      {cur.spec.background === "ai_scene" && (
                        <Mini label="Prompt latar AI (Inggris)"><input className={MINI} value={cur.spec.bgPrompt} onChange={(e) => patch({ bgPrompt: e.target.value })} /></Mini>
                      )}
                    </>)}

                    {tab === "warna" && (<>
                      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                        {(Object.keys(COLOR_LABEL) as (keyof DesignSpec["colors"])[]).map((k) => (
                          <label key={k} className="flex min-w-0 items-center gap-1.5 rounded-md border border-ink/20 px-1.5 py-1 text-[11px]">
                            <input type="color" className="h-6 w-6 shrink-0 cursor-pointer rounded border border-ink/40" value={cur.spec.colors[k]} onChange={(e) => patchColor(k, e.target.value)} />
                            <span className="truncate">{COLOR_LABEL[k]}</span>
                          </label>
                        ))}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-ink/60">Dekorasi (maks 3)</div>
                      <div className="flex flex-wrap gap-1">
                        {DECOR_IDS.map((d) => (
                          <button key={d} type="button" onClick={() => toggleDecor(d)} className={cn("rounded-full border px-2.5 py-0.5 text-[11px]", cur.spec.decor.includes(d) ? "border-ink bg-ink text-cream" : "border-ink/40 bg-white")}>{DECOR_LABEL[d]}</button>
                        ))}
                      </div>
                    </>)}
                  </div>

                  <div className="flex gap-2 border-t border-ink/15 p-2.5 sm:p-4">
                    <PillButton variant="pink" className="min-h-[38px] flex-1 justify-center text-sm sm:flex-none" onClick={() => rerender(false)} disabled={busy}>{busy ? "Merender..." : "Terapkan"}</PillButton>
                    <PillButton className="min-h-[38px] flex-1 justify-center text-sm sm:flex-none" onClick={() => rerender(true)} disabled={busy}>Variasi baru</PillButton>
                  </div>
                </div>
              )}
              {zoom && cur?.url && (
                <button type="button" onClick={() => setZoom(false)} className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" aria-label="Tutup">
                  <img src={cur.url} alt="Poster" className="max-h-full max-w-full rounded-lg" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
