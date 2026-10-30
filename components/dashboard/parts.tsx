"use client";
import { useRef, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { AgentEvent, AgentName, Scene, TimingAnalysis } from "@/lib/agents/schemas";
import { cn } from "@/lib/utils/cn";
import { Dots } from "@/components/ui/kit";

export function WhatsAppBubble({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-[#E5DDD5] p-3">
      <div className="max-w-md whitespace-pre-wrap rounded-lg rounded-tl-none bg-[#DCF8C6] p-3 text-sm shadow-sm">{text}</div>
    </div>
  );
}

const SCENE_TONES = ["bg-blush/70", "bg-sky-soft/80", "bg-sage/70"];

export function SceneTimeline({ scenes, onChange, readOnly }: { scenes: Scene[]; onChange?: (s: Scene[]) => void; readOnly?: boolean }) {
  const drag = useRef<number | null>(null);
  const set = (i: number, patch: Partial<Scene>) => onChange?.(scenes.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const move = (to: number) => {
    const from = drag.current;
    if (from === null || from === to || !onChange) return;
    const next = [...scenes];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
    drag.current = null;
  };
  return (
    <div className="space-y-3">
      {scenes.map((s, i) => (
        <div key={i} draggable={!readOnly} onDragStart={() => (drag.current = i)} onDragOver={(e) => e.preventDefault()} onDrop={() => move(i)}
          className={cn("rounded-xl border border-ink p-3", SCENE_TONES[i % 3])}>
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider">{!readOnly && <GripVertical size={14} aria-hidden />}Detik {s.detik}</span>
            {!readOnly && <button aria-label="Hapus scene" onClick={() => onChange?.(scenes.filter((_, k) => k !== i))}><Trash2 size={15} /></button>}
          </div>
          {readOnly ? (
            <dl className="space-y-1 text-sm"><div><b>Visual:</b> {s.visual}</div><div><b>Teks layar:</b> “{s.teksLayar}”</div><div><b>Narasi:</b> {s.narasi}</div></dl>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              <input aria-label="Rentang detik" className="field" value={s.detik} onChange={(e) => set(i, { detik: e.target.value })} />
              <input aria-label="Teks layar" className="field" value={s.teksLayar} onChange={(e) => set(i, { teksLayar: e.target.value })} placeholder="Teks layar" />
              <textarea aria-label="Visual" className="field md:col-span-2" rows={2} value={s.visual} onChange={(e) => set(i, { visual: e.target.value })} placeholder="Instruksi visual" />
              <textarea aria-label="Narasi" className="field md:col-span-2" rows={2} value={s.narasi} onChange={(e) => set(i, { narasi: e.target.value })} placeholder="Narasi" />
            </div>
          )}
        </div>
      ))}
      {!readOnly && <button className="btn-pill min-h-[40px] text-xs" onClick={() => onChange?.([...scenes, { detik: "0-0", visual: "", teksLayar: "", narasi: "" }])}><Plus size={14} />Tambah scene</button>}
    </div>
  );
}

export function sceneText(scenes: Scene[]): string {
  return scenes.map((s) => `[Detik ${s.detik}: ${s.visual}, Teks Layar: "${s.teksLayar}"]\nNarasi: ${s.narasi}`).join("\n\n");
}

export function Heatmap({ a }: { a: TimingAnalysis }) {
  const max = Math.max(1, ...a.heatmap.flat());
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-[10px]" aria-label="Heatmap transaksi hari x jam">
        <thead><tr><th />{hours.map((h) => <th key={h} className="font-mono font-normal">{h}</th>)}</tr></thead>
        <tbody>
          {a.byDay.map((d, di) => (
            <tr key={d.day}><th className="pr-2 text-right font-mono font-normal">{d.day.slice(0, 3)}</th>
              {hours.map((h) => { const v = a.heatmap[di][h]; return <td key={h} title={`${d.day} ${h}:00, ${v} transaksi`} className="h-7 w-7 rounded" style={{ background: `rgba(244,166,191,${v === 0 ? 0.08 : 0.2 + (v / max) * 0.8})` }} />; })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative mx-auto aspect-[4/5] max-w-sm select-none overflow-hidden rounded-xl border border-ink">
      <img src={after} alt="Sesudah" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}><img src={before} alt="Sebelum" className="h-full max-w-none object-cover" style={{ width: `calc(100% * 100 / ${Math.max(pos, 1)})` }} /></div>
      <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${pos}%` }} />
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Geser perbandingan sebelum dan sesudah" className="absolute inset-x-0 bottom-2 mx-auto w-3/4 accent-[#F4A6BF]" />
    </div>
  );
}

const AGENTS: { id: AgentName; label: string; emoji: string; tone: string }[] = [
  { id: "supervisor", label: "Supervisor", emoji: "🧠", tone: "bg-blush" },
  { id: "timing", label: "Data Agent", emoji: "🕒", tone: "bg-sky-soft" },
  { id: "copywriter", label: "Copywriter", emoji: "✍️", tone: "bg-sage" },
  { id: "designer", label: "Designer", emoji: "🎨", tone: "bg-blush" },
  { id: "compiler", label: "Compiler", emoji: "📦", tone: "bg-sky-soft" },
];

export function AgentWorkspace({ status, log }: { status: Partial<Record<AgentName, AgentEvent["status"]>>; log: AgentEvent[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {AGENTS.map((a) => {
          const st = status[a.id] ?? "pending";
          return (
            <div key={a.id} className={cn("rounded-xl border border-ink p-3", a.tone, st === "pending" && "opacity-60")}>
              <div className="text-2xl" aria-hidden>{a.emoji}</div>
              <div className="font-display text-lg">{a.label}</div>
              <div className="mt-1 flex min-h-[20px] items-center gap-1 font-mono text-[11px] uppercase">
                {st === "running" && <><Dots />bekerja</>}{st === "done" && "✓ selesai"}{st === "error" && "✗ gagal"}{st === "pending" && "menunggu"}
              </div>
            </div>
          );
        })}
      </div>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-ink bg-white p-3 text-sm" aria-live="polite">
        {log.map((l, i) => <div key={i}><span className="font-mono text-[11px] uppercase text-ink/50">{l.agent}</span> {l.message}</div>)}
      </div>
    </div>
  );
}
