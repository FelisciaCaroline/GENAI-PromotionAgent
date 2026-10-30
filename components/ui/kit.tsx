"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Tabs({ tabs, value, onChange, className }: { tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("flex flex-wrap gap-2", className)}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn("min-h-[40px] rounded-full border border-ink px-4 font-mono text-[11px] uppercase tracking-wider transition", value === t.id ? "bg-ink text-cream" : "bg-cream hover:bg-blush")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = "Salin" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn-pill min-h-[36px] px-3 text-xs" onClick={async () => { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      {ok ? <Check size={14} /> : <Copy size={14} />}{ok ? "Tersalin" : label}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-[11px] uppercase tracking-wider">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink/60">{hint}</span>}
    </label>
  );
}

export function Dots() {
  return <span className="inline-flex gap-1" aria-label="memuat">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-ink" style={{ animation: "dots 1.2s infinite", animationDelay: `${i * 0.2}s` }} />)}</span>;
}

export function Empty({ emoji, title, text, children }: { emoji: string; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-ink/60 bg-white/60 p-8 text-center">
      <div className="text-4xl" aria-hidden>{emoji}</div>
      <h3 className="mt-2 font-display text-2xl lowercase">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink/70">{text}</p>
      <div className="mt-4 flex justify-center">{children}</div>
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-xl border border-ink bg-blush/60 px-4 py-3 text-sm">{children}</div>;
}
