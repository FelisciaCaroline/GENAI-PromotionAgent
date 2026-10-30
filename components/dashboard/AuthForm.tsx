"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo, PillButton, Sticker } from "@/components/brand";
import { ErrorNote, Field } from "@/components/ui/kit";
import { getBrowserClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const sb = getBrowserClient();
  const isLogin = mode === "login";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return router.push(isLogin ? "/dashboard" : "/onboarding");
    setBusy(true); setErr("");
    const { error } = isLogin ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setErr(isLogin ? "Email atau kata sandi belum cocok." : "Pendaftaran gagal. Pakai email lain atau kata sandi minimal 6 karakter.");
    router.push(isLogin ? "/dashboard" : "/onboarding");
    router.refresh();
  }

  async function google() {
    await sb?.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
  }

  return (
    <main className="bg-grid grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md rounded-xl border border-ink bg-cream p-6 shadow-[5px_5px_0_#1A1A1A]">
        <div className="flex items-center justify-between"><Logo /><Sticker tone="pink">{isLogin ? "Selamat datang kembali" : "Gratis 10 kampanye"}</Sticker></div>
        <h1 className="mt-4 font-display text-4xl lowercase">{isLogin ? "masuk dulu yuk" : "buat akun baru"}</h1>
        {!sb && <p className="mt-2 rounded-lg bg-sky-soft/70 p-2 text-xs">Mode demo: Supabase belum diatur, jadi kamu bisa masuk langsung. Data tersimpan di browser ini.</p>}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="Email"><input className="field" type="email" required={!!sb} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="Kata sandi"><input className="field" type="password" required={!!sb} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isLogin ? "current-password" : "new-password"} /></Field>
          {err && <ErrorNote>{err}</ErrorNote>}
          <PillButton type="submit" variant="pink" disabled={busy} className="w-full justify-center">{busy ? "Memproses..." : sb ? (isLogin ? "Masuk" : "Daftar") : "Masuk Mode Demo"}</PillButton>
          {sb && <PillButton type="button" onClick={google} className="w-full justify-center">Lanjut dengan Google</PillButton>}
        </form>
        <p className="mt-4 text-center text-sm">
          {isLogin ? <>Belum punya akun? <Link className="underline" href="/register">Daftar</Link></> : <>Sudah punya akun? <Link className="underline" href="/login">Masuk</Link></>}
        </p>
      </div>
    </main>
  );
}
