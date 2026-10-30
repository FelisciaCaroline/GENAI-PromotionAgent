"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo, PillButton } from "@/components/brand";

const MENU = [["FITUR", "#fitur"], ["CARA KERJA", "#cara-kerja"], ["BAHASA", "#bahasa"], ["HARGA", "#harga"], ["FAQ", "#faq"]];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <nav className="flex items-center justify-between rounded-lg border border-ink bg-cream px-4 py-3">
        <Logo />
        <ul className="hidden gap-7 font-mono text-[11px] tracking-[0.15em] md:flex">
          {MENU.map(([l, h]) => <li key={h}><a href={h} className="hover:underline">{l}</a></li>)}
        </ul>
        <div className="hidden md:block"><PillButton href="/login">Mulai Gratis</PillButton></div>
        <button className="md:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </nav>
      {open && (
        <div className="mt-2 space-y-3 rounded-lg border border-ink bg-cream p-4 md:hidden">
          {MENU.map(([l, h]) => <a key={h} href={h} onClick={() => setOpen(false)} className="block font-mono text-xs tracking-widest">{l}</a>)}
          <Link href="/login" className="btn-pill w-full justify-center"><span className="dot" />Mulai Gratis</Link>
        </div>
      )}
    </div>
  );
}
