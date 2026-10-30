"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { BrandCard, PageTitle, PillButton, Sticker } from "@/components/brand";
import { CopyButton, Empty, Tabs } from "@/components/ui/kit";
import { SceneTimeline, WhatsAppBubble, sceneText } from "@/components/dashboard/parts";
import { PosterGallery } from "@/components/dashboard/PosterGallery";
import { langLabel } from "@/lib/ai/languages";
import type { CampaignReport } from "@/lib/agents/schemas";
import { buildIcs, download } from "@/lib/utils/ics";
import { getCampaign, getChecks, saveChecks } from "@/lib/utils/client-store";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<CampaignReport | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState("ringkasan");
  const [vi, setVi] = useState(0);
  const [pi, setPi] = useState(0);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const local = getCampaign(id);
    setChecks(getChecks(id));
    if (local) return setR(local);
    fetch(`/api/campaign/${id}`).then((x) => (x.ok ? x.json() : Promise.reject())).then(setR).catch(() => setMissing(true));
  }, [id]);

  if (missing) return <Empty emoji="🔍" title="kampanye tidak ditemukan" text="Mungkin sudah dihapus atau dibuat di perangkat lain."><PillButton href="/dashboard/history">Ke riwayat</PillButton></Empty>;
  if (!r) return <p className="p-6 text-sm">Memuat laporan...</p>;

  const v = r.copy?.variants[vi];
  const wa = (text: string) => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");

  async function zip() {
    if (!r) return;
    const JSZip = (await import("jszip")).default;
    const z = new JSZip();
    r.copy?.variants.forEach((x) => {
      z.file(`caption-${x.language}.txt`, `WHATSAPP\n${x.whatsappBroadcast}\n\nINSTAGRAM\n${x.instagramCaption}\n\n${x.hashtags.join(" ")}`);
      z.file(`naskah-video-${x.language}.txt`, sceneText(x.reelsScript.scenes));
    });
    r.design?.posters?.forEach((p, i) => { if (p.url?.startsWith("data:")) z.file(`poster-${i + 1}.jpg`, p.url.split(",")[1], { base64: true }); });
    if (!r.design?.posters?.length && r.design?.posterUrl?.startsWith("data:")) z.file("poster.jpg", r.design.posterUrl.split(",")[1], { base64: true });
    z.file("jadwal.ics", buildIcs(r.schedule, r.goal));
    const blob = await z.generateAsync({ type: "blob" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "paket-kampanye.zip"; a.click();
  }

  const VariantTabs = r.copy && r.copy.variants.length > 1 && (
    <Tabs className="mb-3" value={String(vi)} onChange={(x) => setVi(Number(x))} tabs={r.copy.variants.map((x, i) => ({ id: String(i), label: x.language.split("+").map(langLabel).join(" + ") }))} />
  );

  return (
    <div>
      <PageTitle title={r.goal.length > 70 ? r.goal.slice(0, 70) + "..." : r.goal} sticker={r.status === "selesai" ? "Laporan kampanye" : "Hasil sebagian"} sub={format(new Date(r.createdAt), "EEEE, d MMMM yyyy HH:mm", { locale: idLocale })} />
      {r.errors.length > 0 && <div className="mb-3 rounded-xl border border-ink bg-blush/60 p-3 text-sm">Sebagian agen gagal: {r.errors.join("; ")}</div>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: "ringkasan", label: "Ringkasan" }, { id: "jadwal", label: "Jadwal" }, { id: "copy", label: "Copywriting" }, { id: "video", label: "Naskah Video" }, { id: "poster", label: "Poster" }]} />
      </div>

      {tab === "ringkasan" && (
        <div className="grid gap-4 md:grid-cols-2">
          <BrandCard tone="pink"><h3 className="font-display text-2xl">Strategi</h3><p className="mt-1 text-sm">{r.summary}</p>
            {r.plan && <dl className="mt-3 space-y-1 text-sm"><div><b>Target:</b> {r.plan.targetAudiens}</div><div><b>Penawaran:</b> {r.plan.penawaran}</div><div><b>Periode:</b> {r.plan.periodeWaktu}</div></dl>}
            {r.timing && <div className="mt-3"><Sticker tone="white">Waktu emas: {r.timing.recommendation.bestDay} {r.timing.recommendation.bestHour}</Sticker><p className="mt-2 text-sm">{r.timing.recommendation.reasoning}</p></div>}</BrandCard>
          <BrandCard tone="white"><h3 className="font-display text-2xl">Checklist eksekusi</h3>
            <ul className="mt-2 space-y-1">{r.checklist.map((c) => <li key={c}><label className="flex min-h-[36px] items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#F4A6BF]" checked={!!checks[c]} onChange={(e) => { const n = { ...checks, [c]: e.target.checked }; setChecks(n); saveChecks(r.id, n); }} />{c}</label></li>)}</ul>
            <p className="mt-3 text-xs text-ink/60">{r.impact}</p></BrandCard>
        </div>
      )}

      {tab === "jadwal" && (
        r.schedule.length === 0 ? <Empty emoji="🕒" title="jadwal belum tersedia" text="Agen timing tidak berhasil. Coba jalankan Timing Optimizer." /> : (
          <div className="space-y-3">
            {r.schedule.map((s, i) => (
              <BrandCard key={i} tone={(["blue", "pink", "green", "white"] as const)[i % 4]} className="flex flex-wrap items-center justify-between gap-2">
                <div><div className="font-mono text-[11px] uppercase">{s.channel}</div><div className="font-semibold">{s.label}</div></div>
                <div className="text-sm">{format(new Date(s.datetime), "EEEE, d MMM HH:mm", { locale: idLocale })}</div>
              </BrandCard>
            ))}
            <PillButton onClick={() => download("jadwal-promo.ics", buildIcs(r.schedule, r.goal), "text/calendar")}>Unduh .ics</PillButton>
          </div>
        )
      )}

      {tab === "copy" && (v ? (
        <div className="space-y-4">{VariantTabs}
          <div><div className="mb-1 flex items-center justify-between"><h3 className="font-display text-xl">WhatsApp</h3><span className="flex gap-2"><CopyButton text={v.whatsappBroadcast} /><button className="btn-pill min-h-[36px] px-3 text-xs" onClick={() => wa(v.whatsappBroadcast)}>Kirim ke WA</button></span></div><WhatsAppBubble text={v.whatsappBroadcast} /></div>
          <div><div className="mb-1 flex items-center justify-between"><h3 className="font-display text-xl">Instagram</h3><CopyButton text={v.instagramCaption} /></div><div className="whitespace-pre-wrap rounded-xl border border-ink bg-white p-3 text-sm">{v.instagramCaption}</div></div>
          <div><div className="mb-1 flex items-center justify-between"><h3 className="font-display text-xl">Hashtag</h3><CopyButton text={v.hashtags.join(" ")} /></div><div className="flex flex-wrap gap-1">{v.hashtags.map((h) => <span key={h} className="rounded-full bg-sky-soft px-2 py-0.5 text-xs">{h}</span>)}</div></div>
        </div>
      ) : <Empty emoji="✍️" title="teks belum tersedia" text="Agen copywriter tidak berhasil. Coba di Copywriter Studio." />)}

      {tab === "video" && (v ? (
        <div className="space-y-3">{VariantTabs}
          <div className="flex flex-wrap items-center gap-2"><Sticker tone="pink">{v.reelsScript.durasiDetik} detik</Sticker><span className="text-sm">Hook: {v.reelsScript.hook}</span></div>
          <SceneTimeline scenes={v.reelsScript.scenes} readOnly />
          <p className="text-sm"><b>CTA:</b> {v.reelsScript.cta} · <b>Musik:</b> {v.reelsScript.musikSaran}</p>
          <div className="flex gap-2"><CopyButton text={sceneText(v.reelsScript.scenes)} label="Salin naskah" /><button className="btn-pill min-h-[36px] px-3 text-xs" onClick={() => download("naskah-video.txt", sceneText(v.reelsScript.scenes))}>Unduh .txt</button></div>
        </div>
      ) : <Empty emoji="🎬" title="naskah belum tersedia" text="Agen copywriter tidak berhasil." />)}

      {tab === "poster" && (r.design?.posters?.some((p) => p.url) ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">{r.design.kategori && <Sticker tone="blue">Kategori: {r.design.kategori}</Sticker>}{r.design.musiman && !/tidak/i.test(r.design.musiman) && <Sticker tone="pink">Momen: {r.design.musiman}</Sticker>}</div>
          <PosterGallery slots={r.design.posters.map((p) => ({ concept: p.concept, url: p.url, error: p.error }))} selected={pi} onSelect={setPi} />
          {r.design.posters[pi]?.url && (<div className="space-y-2"><img src={r.design.posters[pi].url!} alt="Poster terpilih" className="mx-auto max-h-[70vh] rounded-xl border border-ink" /><p className="text-center text-sm">{r.design.posters[pi].concept.alasan}</p>
            <div className="flex flex-wrap justify-center gap-2"><a className="btn-pill" download={`poster-${pi + 1}.jpg`} href={r.design.posters[pi].url!}><span className="dot" />Unduh poster ini</a><PillButton href="/dashboard/visual">Buat konsep lain di Visual Studio</PillButton></div></div>)}
          {r.design.note && <p className="text-center text-xs text-ink/60">{r.design.note}</p>}
        </div>
      ) : r.design?.posterUrl ? (
        <div className="space-y-3"><img src={r.design.posterUrl} alt="Poster promo" className="mx-auto max-h-[70vh] rounded-xl border border-ink" /><div className="flex justify-center"><a className="btn-pill" download="poster.jpg" href={r.design.posterUrl}><span className="dot" />Unduh poster</a></div></div>
      ) : <Empty emoji="🎨" title="poster belum tersedia" text="Agen designer tidak berhasil. Coba di Visual Studio."><PillButton href="/dashboard/visual">Buka Visual Studio</PillButton></Empty>)}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-ink/20 pt-4">
        <PillButton variant="pink" onClick={zip}>Unduh Paket (.zip)</PillButton>
        <PillButton onClick={() => wa(`${r.goal}\n\n${v?.whatsappBroadcast ?? ""}`)}>Bagikan ke WhatsApp</PillButton>
      </div>
    </div>
  );
}
