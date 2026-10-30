"use client";
import { PillButton } from "@/components/brand";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="bg-grid grid min-h-screen place-items-center p-6 text-center">
      <div><div className="text-5xl" aria-hidden>🫠</div><h1 className="mt-2 font-display text-4xl lowercase">ada yang tidak beres</h1>
        <p className="mt-2 text-sm text-ink/70">Coba muat ulang halaman ini.</p><div className="mt-5"><PillButton onClick={reset}>Coba lagi</PillButton></div></div>
    </main>
  );
}
