"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { BrandCard, PageTitle, PillButton, Sticker } from "@/components/brand";
import { Empty } from "@/components/ui/kit";
import type { CampaignReport } from "@/lib/agents/schemas";
import { getCampaigns, getTip, saveTip } from "@/lib/utils/client-store";

export default function Home() {
  const [list, setList] = useState<CampaignReport[]>([]);
  const [tip, setTip] = useState("");

  useEffect(() => {
    setList(getCampaigns());
    const today = format(new Date(), "yyyy-MM-dd");
    const cached = getTip();
    if (cached?.date === today) return setTip(cached.text);
    fetch("/api/tips").then((r) => r.json()).then((j) => { setTip(j.text); saveTip({ date: today, text: j.text }); }).catch(() => {});
  }, []);

  const golden = list.find((c) => c.timing)?.timing?.recommendation;

  return (
    <div>
      <PageTitle title="beranda" sticker="Ringkasan harianmu" sub="Mulai dari satu kalimat, biar agen AI yang menyiapkan sisanya." />
      <div className="grid gap-4 md:grid-cols-3">
        <BrandCard tone="pink"><div className="font-mono text-[11px] uppercase">Kampanye dibuat</div><div className="font-display text-5xl">{list.length}</div></BrandCard>
        <BrandCard tone="blue"><div className="font-mono text-[11px] uppercase">Waktu emas</div><div className="font-display text-3xl">{golden ? `${golden.bestDay} ${golden.bestHour}` : "Belum ada"}</div></BrandCard>
        <BrandCard tone="green"><div className="font-mono text-[11px] uppercase">Kampanye terakhir</div><div className="line-clamp-2 text-sm font-semibold">{list[0]?.goal ?? "Belum ada kampanye"}</div></BrandCard>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><PillButton href="/dashboard/campaign/new" variant="pink">Buat Kampanye Baru</PillButton>{tip && <Sticker tone="blue" rotate={0} className="normal-case tracking-normal">💡 {tip}</Sticker>}</div>
      <h2 className="mb-3 mt-8 font-display text-2xl lowercase">kampanye terbaru</h2>
      {list.length === 0 ? (
        <Empty emoji="🍒" title="belum ada kampanye" text="Tulis tujuan promo pertamamu dan lihat agen AI bekerja."><PillButton href="/dashboard/campaign/new" variant="pink">Mulai sekarang</PillButton></Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {list.slice(0, 3).map((c) => (
            <Link key={c.id} href={`/dashboard/campaign/${c.id}`} className="block rounded-xl border border-ink bg-white p-3 hover:bg-blush/30">
              {c.design?.posterUrl && <img src={c.design.posterUrl} alt="Poster" className="mb-2 aspect-[4/5] w-full rounded-lg object-cover" />}
              <div className="line-clamp-2 font-semibold">{c.goal}</div>
              <div className="text-xs text-ink/60">{format(new Date(c.createdAt), "d MMM yyyy, HH:mm", { locale: idLocale })}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
