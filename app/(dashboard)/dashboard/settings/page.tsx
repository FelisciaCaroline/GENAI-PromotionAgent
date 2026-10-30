"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageTitle, PillButton } from "@/components/brand";
import { Field } from "@/components/ui/kit";
import { LanguagePicker, normalizeLang } from "@/components/dashboard/LanguagePicker";
import { DEFAULT_LANG, type LanguageConfig } from "@/lib/agents/schemas";
import { getBrowserClient } from "@/lib/supabase/client";
import { getProfile, saveProfile } from "@/lib/utils/client-store";

export default function SettingsPage() {
  const router = useRouter();
  const [p, setP] = useState({ namaUsaha: "", jenisUsaha: "", kota: "" });
  const [lang, setLang] = useState<LanguageConfig>(DEFAULT_LANG);
  const [ok, setOk] = useState(false);
  useEffect(() => { const x = getProfile(); if (x) { setP({ namaUsaha: x.namaUsaha, jenisUsaha: x.jenisUsaha, kota: x.kota }); setLang(x.bahasaDefault); } }, []);

  async function save() {
    const bahasaDefault = normalizeLang(lang);
    saveProfile({ ...p, bahasaDefault });
    const sb = getBrowserClient();
    const { data } = (await sb?.auth.getUser()) ?? { data: { user: null } };
    if (sb && data.user) await sb.from("profiles").upsert({ id: data.user.id, nama_usaha: p.namaUsaha, jenis_usaha: p.jenisUsaha, kota: p.kota, gaya_bahasa_default: lang.style, bahasa_default: bahasaDefault });
    setOk(true); setTimeout(() => setOk(false), 2000);
  }

  async function wipe() {
    if (!confirm("Hapus semua data lokal dan keluar? Akun di server tidak ikut terhapus.")) return;
    localStorage.clear();
    await getBrowserClient()?.auth.signOut();
    router.push("/");
  }

  return (
    <div>
      <PageTitle title="pengaturan" sticker="Profil & bahasa" />
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Nama usaha"><input className="field" value={p.namaUsaha} onChange={(e) => setP({ ...p, namaUsaha: e.target.value })} /></Field>
        <Field label="Jenis usaha"><input className="field" value={p.jenisUsaha} onChange={(e) => setP({ ...p, jenisUsaha: e.target.value })} /></Field>
        <Field label="Kota"><input className="field" value={p.kota} onChange={(e) => setP({ ...p, kota: e.target.value })} /></Field>
      </div>
      <h2 className="mb-2 mt-6 font-display text-2xl lowercase">bahasa & tone default</h2>
      <LanguagePicker value={lang} onChange={setLang} />
      <div className="mt-4 flex flex-wrap gap-2"><PillButton variant="pink" onClick={save}>{ok ? "Tersimpan ✓" : "Simpan"}</PillButton><PillButton variant="outline" onClick={wipe}>Hapus data & keluar</PillButton></div>
    </div>
  );
}
