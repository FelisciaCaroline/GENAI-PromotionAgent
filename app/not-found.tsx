import { PillButton } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="bg-grid grid min-h-screen place-items-center p-6 text-center">
      <div><div className="text-5xl" aria-hidden>🍒</div><h1 className="mt-2 font-display text-5xl lowercase">halaman tidak ketemu</h1>
        <p className="mt-2 text-sm text-ink/70">Mungkin alamatnya salah ketik.</p><div className="mt-5"><PillButton href="/">Kembali ke beranda</PillButton></div></div>
    </main>
  );
}
