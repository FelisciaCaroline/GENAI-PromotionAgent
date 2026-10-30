"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo, PillButton, Sticker } from "@/components/brand";
import { Field } from "@/components/ui/kit";
import { LanguagePicker, normalizeLang } from "@/components/dashboard/LanguagePicker";
import { DEFAULT_LANG, type LanguageConfig } from "@/lib/agents/schemas";
import { getBrowserClient } from "@/lib/supabase/client";
import { saveProfile } from "@/lib/utils/client-store";

const JENIS = ["Kopi & minuman", "Kuliner", "Fashion", "Kerajinan", "Kecantikan", "Jasa", "Lainnya"];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [nama, setNama] = useState("");
  const [jenis, setJenis] = useState(JENIS[0]);
  const [kota, setKota] = useState("");
  const [lang, setLang] = useState<LanguageConfig>(DEFAULT_LANG);

  async function finish() {
    const bahasaDefault = normalizeLang(lang);
    saveProfile({ namaUsaha: nama || "Usahaku", jenisUsaha: jenis, kota, bahasaDefault });
    const sb = getBrowserClient();
    const { data } = (await sb?.auth.getUser()) ?? { data: { user: null } };
    if (sb && data.user) await sb.from("profiles").upsert({ id: data.user.id, nama_usaha: nama, jenis_usaha: jenis, kota, gaya_bahasa_default: lang.style, bahasa_default: bahasaDefault });
    router.push("/dashboard");
  }

  return (
    <main className="bg-grid grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-xl rounded-xl border border-ink bg-cream p-6 shadow-[5px_5px_0_#1A1A1A]">
        <div className="flex items-center justify-between"><Logo /><Sticker tone="blue">Langkah {step + 1} dari 3</Sticker></div>
        {step === 0 && (<div className="mt-4 space-y-3"><h1 className="font-display text-4xl lowercase">nama usahamu?</h1>
          <Field label="Nama usaha"><input className="field" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Warung Kopi Sari" /></Field>
          <Field label="Kota"><input className="field" value={kota} onChange={(e) => setKota(e.target.value)} placeholder="Malang" /></Field></div>)}
        {step === 1 && (<div className="mt-4"><h1 className="font-display text-4xl lowercase">jenis usaha</h1>
          <div className="mt-3 flex flex-wrap gap-2">{JENIS.map((j) => <button key={j} onClick={() => setJenis(j)} className={`min-h-[44px] rounded-full border border-ink px-4 text-sm ${jenis === j ? "bg-blush" : "bg-cream hover:bg-sky-soft"}`}>{j}</button>)}</div></div>)}
        {step === 2 && (<div className="mt-4"><h1 className="font-display text-4xl lowercase">bahasa default</h1><p className="mb-3 text-sm text-ink/70">Bisa diubah kapan saja di Pengaturan.</p><LanguagePicker value={lang} onChange={setLang} /></div>)}
        <div className="mt-6 flex justify-between">
          <PillButton variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Kembali</PillButton>
          {step < 2 ? <PillButton variant="pink" onClick={() => setStep(step + 1)}>Lanjut</PillButton> : <PillButton variant="pink" onClick={finish}>Selesai</PillButton>}
        </div>
      </div>
    </main>
  );
}
