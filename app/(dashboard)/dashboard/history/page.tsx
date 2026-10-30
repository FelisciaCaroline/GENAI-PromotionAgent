"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { PageTitle, PillButton } from "@/components/brand";
import { Empty } from "@/components/ui/kit";
import type { CampaignReport } from "@/lib/agents/schemas";
import { deleteCampaign, getCampaigns } from "@/lib/utils/client-store";

export default function HistoryPage() {
  const [list, setList] = useState<CampaignReport[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("semua");
  useEffect(() => setList(getCampaigns()), []);

  const shown = list.filter((c) => c.goal.toLowerCase().includes(q.toLowerCase()) && (status === "semua" || c.status === status));
  function remove(id: string) {
    if (!confirm("Hapus kampanye ini? Tindakan ini tidak bisa dibatalkan.")) return;
    deleteCampaign(id);
    fetch(`/api/campaign/${id}`, { method: "DELETE" }).catch(() => {});
    setList(getCampaigns());
  }

  return (
    <div>
      <PageTitle title="riwayat kampanye" sticker="Semua kampanyemu" />
      <div className="mb-4 flex flex-wrap gap-2">
        <input aria-label="Cari kampanye" className="field max-w-xs" placeholder="Cari..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter status" className="field max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}><option value="semua">Semua status</option><option value="selesai">Selesai</option><option value="parsial">Sebagian</option><option value="gagal">Gagal</option></select>
      </div>
      {shown.length === 0 ? <Empty emoji="📁" title="belum ada kampanye" text="Kampanye yang kamu buat akan muncul di sini."><PillButton href="/dashboard/campaign/new" variant="pink">Buat kampanye</PillButton></Empty> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <div key={c.id} className="rounded-xl border border-ink bg-white p-3">
              <Link href={`/dashboard/campaign/${c.id}`}>
                {c.design?.posterUrl ? <img src={c.design.posterUrl} alt="" className="mb-2 aspect-[4/5] w-full rounded-lg object-cover" /> : <div className="mb-2 grid aspect-[4/5] place-items-center rounded-lg bg-sky-soft/60 text-4xl">📣</div>}
                <div className="line-clamp-2 font-semibold">{c.goal}</div>
              </Link>
              <div className="mt-1 flex items-center justify-between text-xs"><span>{format(new Date(c.createdAt), "d MMM yyyy", { locale: idLocale })}</span><span className="rounded-full bg-sage px-2 py-0.5 font-mono uppercase">{c.status}</span></div>
              <div className="mt-2 flex gap-2"><Link className="btn-pill min-h-[36px] px-3 text-xs" href={`/dashboard/campaign/new?goal=${encodeURIComponent(c.goal)}`}>Duplikat</Link><button className="btn-pill min-h-[36px] px-3 text-xs" onClick={() => remove(c.id)}>Hapus</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
