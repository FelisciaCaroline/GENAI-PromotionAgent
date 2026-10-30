"use client";
import { useState } from "react";
import { LANGUAGES, MIX_MODES, langName } from "@/lib/ai/languages";
import { STYLES } from "@/lib/ai/styles";
import { DEFAULT_LANG, type LanguageConfig } from "@/lib/agents/schemas";
import { Dots } from "@/components/ui/kit";
import { cn } from "@/lib/utils/cn";

export function normalizeLang(c: LanguageConfig): LanguageConfig {
  if (c.mixMode === "single") return { ...c, secondary: [] };
  return c;
}

export function LanguagePicker({ value, onChange }: { value: LanguageConfig; onChange: (v: LanguageConfig) => void }) {
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = [value.primary, ...value.secondary];
  const needsTwo = value.mixMode !== "single" && value.secondary.length === 0;

  function toggle(code: string) {
    let next = selected.includes(code) ? selected.filter((c) => c !== code) : selected.length < 3 ? [...selected, code] : selected;
    if (next.length === 0) next = [DEFAULT_LANG.primary];
    onChange({ ...value, primary: next[0], secondary: next.slice(1) });
  }

  async function runPreview() {
    setBusy(true); setPreview("");
    try {
      const r = await fetch("/api/agents/preview-style", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(normalizeLang(value)) });
      const j = await r.json();
      setPreview(j.text ?? j.error ?? "Pratinjau gagal.");
    } catch { setPreview("Pratinjau gagal. Coba lagi."); }
    setBusy(false);
  }

  return (
    <div className="space-y-4 rounded-xl border border-ink bg-white p-4">
      <div>
        <div className="mb-2 font-mono text-[11px] uppercase tracking-wider">Bahasa (maks 3, yang pertama dipilih jadi utama)</div>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => {
            const idx = selected.indexOf(l.code);
            return (
              <button key={l.code} type="button" aria-pressed={idx >= 0} onClick={() => toggle(l.code)}
                className={cn("min-h-[40px] rounded-full border border-ink px-3 text-sm", idx >= 0 ? "bg-blush" : "bg-cream hover:bg-sky-soft")}>
                {l.bendera} {l.nama}{idx === 0 && " ★"}
                {l.status === "beta" && <span className="ml-1 rounded bg-sky-soft px-1 font-mono text-[9px]">BETA</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 font-mono text-[11px] uppercase tracking-wider">Cara memakai bahasa</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {MIX_MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={value.mixMode === m.id} title={m.hint} onClick={() => onChange({ ...value, mixMode: m.id })}
              className={cn("min-h-[44px] rounded-lg border border-ink px-2 text-sm", value.mixMode === m.id ? "bg-ink text-cream" : "bg-cream hover:bg-blush")}>{m.label}</button>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink/60">{MIX_MODES.find((m) => m.id === value.mixMode)?.hint}</p>
        {needsTwo && <p className="mt-1 text-xs font-semibold">Pilih minimal 2 bahasa untuk mode ini.</p>}
      </div>

      {value.mixMode === "mixed" && value.secondary[0] && (
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider" htmlFor="ratio">Rasio campuran</label>
          <input id="ratio" type="range" min={30} max={90} step={5} value={value.mixRatio} onChange={(e) => onChange({ ...value, mixRatio: Number(e.target.value) })} className="w-full accent-[#F4A6BF]" />
          <p className="text-xs">{value.mixRatio}% {langName(value.primary)} · {100 - value.mixRatio}% {langName(value.secondary[0])}</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-xs"><span className="font-mono text-[11px] uppercase tracking-wider">Gaya</span>
          <select className="field mt-1" value={value.style} onChange={(e) => onChange({ ...value, style: e.target.value })}>{STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <label className="block text-xs"><span className="font-mono text-[11px] uppercase tracking-wider">Panjang</span>
          <select className="field mt-1" value={value.length} onChange={(e) => onChange({ ...value, length: e.target.value as LanguageConfig["length"] })}><option value="singkat">Singkat</option><option value="sedang">Sedang</option><option value="panjang">Panjang</option></select></label>
        <label className="flex min-h-[44px] items-end gap-2 pb-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[#F4A6BF]" checked={value.emoji} onChange={(e) => onChange({ ...value, emoji: e.target.checked })} />Pakai emoji</label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-pill min-h-[40px] text-xs" onClick={runPreview} disabled={busy}><span className="dot" />Pratinjau gaya</button>
        {busy && <Dots />}
        {preview && <p className="rounded-lg bg-sky-soft/60 px-3 py-2 text-sm" aria-live="polite">{preview}</p>}
      </div>
    </div>
  );
}
