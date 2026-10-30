"use client";
import { PALETTES, templateLabel } from "@/lib/image/catalog";
import type { PosterConcept } from "@/lib/agents/schemas";
import { cn } from "@/lib/utils/cn";
import { Dots } from "@/components/ui/kit";

export type Slot = { concept: PosterConcept; url: string | null; error?: string; loading?: boolean };

// Galeri konsep poster: skeleton saat dirender, klik untuk memilih
export function PosterGallery({ slots, selected, onSelect, aspect = "aspect-[4/5]" }: { slots: Slot[]; selected: number; onSelect: (i: number) => void; aspect?: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {slots.map((s, i) => {
        const pal = PALETTES[s.concept.paletteId];
        return (
          <button key={i} type="button" onClick={() => onSelect(i)} aria-pressed={selected === i}
            className={cn("overflow-hidden rounded-xl border bg-white text-left", selected === i ? "border-2 border-ink shadow-[3px_3px_0_#1A1A1A]" : "border-ink/40 hover:border-ink")}>
            <div className={cn("relative grid w-full place-items-center bg-sky-soft/50", aspect)}>
              {s.url ? <img src={s.url} alt={`Konsep ${i + 1}: ${s.concept.headline}`} className="h-full w-full object-cover" />
                : s.error ? <span className="p-2 text-center text-xs">Gagal dirender</span>
                : <div className="text-center text-xs"><Dots /><div className="mt-2">Merender...</div></div>}
            </div>
            <div className="p-2">
              <div className="truncate font-mono text-[10px] uppercase tracking-wider">{templateLabel(s.concept.templateId)}</div>
              <div className="mt-1 flex items-center gap-1">{[pal.primary, pal.accent, pal.ink].map((c) => <span key={c} className="h-3 w-3 rounded-full border border-ink/40" style={{ background: c }} />)}<span className="ml-1 truncate text-[11px]">{pal.label}</span></div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
