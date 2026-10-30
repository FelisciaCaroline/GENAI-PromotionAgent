"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageTitle, PillButton } from "@/components/brand";
import { CopyButton, Dots, Empty, ErrorNote, Field, Tabs } from "@/components/ui/kit";
import { LanguagePicker } from "@/components/dashboard/LanguagePicker";
import { WhatsAppBubble } from "@/components/dashboard/parts";
import { useCopy } from "@/components/dashboard/useCopy";
import { STYLES } from "@/lib/ai/styles";
import { langLabel } from "@/lib/ai/languages";
import { DEFAULT_LANG, type LanguageConfig } from "@/lib/agents/schemas";
import { getProfile } from "@/lib/utils/client-store";

export default function CopywriterPage() {
  const [form, setForm] = useState({ goal: "", produk: "", target: "", penawaran: "" });
  const [lang, setLang] = useState<LanguageConfig>(DEFAULT_LANG);
  const [tab, setTab] = useState("wa");
  const [vi, setVi] = useState(0);
  const { data, setData, loading, error, run } = useCopy();
  useEffect(() => { const p = getProfile(); if (p) setLang(p.bahasaDefault); }, []);

  const go = (l = lang) => { setVi(0); return run({ ...form, goal: form.goal || `Promo ${form.produk}` }, l); };
  const v = data?.variants[vi];
  const edit = (patch: Partial<NonNullable<typeof v>>) => data && setData({ variants: data.variants.map((x, i) => (i === vi ? { ...x, ...patch } : x)) });

  function otherStyle() {
    const others = STYLES.filter((s) => s.id !== lang.style);
    const next = { ...lang, style: others[Math.floor(Math.random() * others.length)].id };
    setLang(next); go(next);
  }
  function toReels() { if (v) localStorage.setItem("pa_reels", JSON.stringify({ script: v.reelsScript, form })); }

  return (
    <div>
      <PageTitle title="copywriter studio" sticker="Caption multi-bahasa" sub="Tulis caption WhatsApp dan Instagram dalam bahasa dan gaya pilihanmu." />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Tujuan promo"><input className="field" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="Cuci gudang minggu depan" /></Field>
        <Field label="Produk"><input className="field" value={form.produk} onChange={(e) => setForm({ ...form, produk: e.target.value })} placeholder="Kopi susu gula aren" /></Field>
        <Field label="Target audiens"><input className="field" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="Anak kampus" /></Field>
        <Field label="Penawaran"><input className="field" value={form.penawaran} onChange={(e) => setForm({ ...form, penawaran: e.target.value })} placeholder="Diskon 20%, Rp 15.000" /></Field>
      </div>
      <div className="mt-4"><LanguagePicker value={lang} onChange={setLang} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <PillButton variant="pink" disabled={loading || !form.produk.trim()} onClick={() => go()}>{loading ? "Menulis..." : "Buat Caption"}</PillButton>
        {data && <><PillButton disabled={loading} onClick={() => go()}>Regenerate</PillButton><PillButton disabled={loading} onClick={otherStyle}>Buat varian gaya lain</PillButton></>}
      </div>
      {loading && <div className="mt-4"><Dots /></div>}
      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
      {!data && !loading && <div className="mt-6"><Empty emoji="✍️" title="belum ada caption" text="Isi produk dulu, lalu tekan Buat Caption." /></div>}
      {v && data && (
        <div className="mt-6 space-y-3">
          {data.variants.length > 1 && <Tabs value={String(vi)} onChange={(x) => setVi(Number(x))} tabs={data.variants.map((x, i) => ({ id: String(i), label: x.language.split("+").map(langLabel).join(" + ") }))} />}
          <Tabs value={tab} onChange={setTab} tabs={[{ id: "wa", label: "WhatsApp" }, { id: "ig", label: "Instagram" }, { id: "ht", label: "Hashtag" }]} />
          {tab === "wa" && <div className="space-y-2"><WhatsAppBubble text={v.whatsappBroadcast} /><textarea aria-label="Edit WhatsApp" className="field" rows={5} value={v.whatsappBroadcast} onChange={(e) => edit({ whatsappBroadcast: e.target.value })} /><CopyButton text={v.whatsappBroadcast} /></div>}
          {tab === "ig" && <div className="space-y-2"><div className="rounded-xl border border-ink bg-white"><div className="aspect-square bg-gradient-to-br from-blush to-sky-soft" /><p className="whitespace-pre-wrap p-3 text-sm">{v.instagramCaption}</p></div><textarea aria-label="Edit Instagram" className="field" rows={5} value={v.instagramCaption} onChange={(e) => edit({ instagramCaption: e.target.value })} /><CopyButton text={v.instagramCaption} /></div>}
          {tab === "ht" && <div className="space-y-2"><div className="flex flex-wrap gap-1">{v.hashtags.map((h) => <span key={h} className="rounded-full bg-sky-soft px-2 py-0.5 text-sm">{h}</span>)}</div><CopyButton text={v.hashtags.join(" ")} /></div>}
          <Link href="/dashboard/reels" onClick={toReels} className="btn-pill"><span className="dot" />Kirim ke Reels Blueprint</Link>
        </div>
      )}
    </div>
  );
}
