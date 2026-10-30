"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Logo, Sticker } from "@/components/brand";
import { getBrowserClient } from "@/lib/supabase/client";
import { getProfile } from "@/lib/utils/client-store";
import { cn } from "@/lib/utils/cn";

export const NAV = [
  { href: "/dashboard", icon: "🏠", label: "Beranda" },
  { href: "/dashboard/campaign/new", icon: "✨", label: "Buat Kampanye" },
  { href: "/dashboard/timing", icon: "🕒", label: "Timing Optimizer" },
  { href: "/dashboard/copywriter", icon: "✍️", label: "Copywriter Studio" },
  { href: "/dashboard/reels", icon: "🎬", label: "Reels Blueprint" },
  { href: "/dashboard/visual", icon: "🎨", label: "Visual Studio" },
  { href: "/dashboard/data", icon: "📊", label: "Data Transaksi" },
  { href: "/dashboard/history", icon: "📁", label: "Riwayat" },
  { href: "/dashboard/settings", icon: "⚙️", label: "Pengaturan" },
];

function NavList({ onNav }: { onNav?: () => void }) {
  const path = usePathname();
  return (
    <ul className="space-y-1">
      {NAV.map((n) => {
        const active = n.href === "/dashboard" ? path === n.href : path.startsWith(n.href);
        return (
          <li key={n.href}>
            <Link href={n.href} onClick={onNav} aria-current={active ? "page" : undefined}
              className={cn("flex min-h-[44px] items-center gap-3 rounded-lg border px-3 font-mono text-[11px] uppercase tracking-wider", active ? "border-ink bg-blush" : "border-transparent hover:bg-sky-soft/60")}>
              <span aria-hidden>{n.icon}</span>{n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => { setName(getProfile()?.namaUsaha ?? ""); }, []);

  async function logout() {
    await getBrowserClient()?.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="bg-grid min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-5 p-3 md:p-5">
        <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-60 flex-none flex-col justify-between rounded-xl border border-ink bg-cream p-3 md:flex">
          <div><div className="mb-4 px-2"><Logo /></div><NavList /></div>
          <button onClick={logout} className="flex min-h-[44px] items-center gap-2 px-3 font-mono text-[11px] uppercase tracking-wider hover:underline"><LogOut size={14} />Keluar</button>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-5 flex items-center justify-between rounded-xl border border-ink bg-cream px-4 py-3">
            <div className="flex items-center gap-3">
              <button className="md:hidden" aria-label="Buka menu" onClick={() => setOpen(true)}><Menu /></button>
              <div><div className="font-display text-xl lowercase">Halo{name ? `, ${name}` : ""}! 👋</div></div>
            </div>
            <div className="flex items-center gap-2"><Sticker tone="green" className="hidden sm:inline-block">AI siap bekerja</Sticker>
              <div className="grid h-9 w-9 place-items-center rounded-full border border-ink bg-blush font-display">{(name || "U")[0].toUpperCase()}</div></div>
          </header>
          <main className="pb-20 md:pb-6">{children}</main>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto border-r border-ink bg-cream p-3">
            <div className="mb-3 flex items-center justify-between px-2"><Logo /><button aria-label="Tutup menu" onClick={() => setOpen(false)}><X /></button></div>
            <NavList onNav={() => setOpen(false)} />
            <button onClick={logout} className="mt-4 flex min-h-[44px] items-center gap-2 px-3 font-mono text-[11px] uppercase"><LogOut size={14} />Keluar</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-ink bg-cream md:hidden" aria-label="Navigasi utama">
        {[NAV[0], NAV[1], NAV[3], NAV[5], NAV[7]].map((n) => <Link key={n.href} href={n.href} className="flex min-h-[56px] flex-col items-center justify-center text-[10px]"><span aria-hidden className="text-lg">{n.icon}</span>{n.label.split(" ")[0]}</Link>)}
      </nav>
    </div>
  );
}
