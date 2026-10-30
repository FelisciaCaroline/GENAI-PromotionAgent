"use client";
// Penyimpanan lokal (MODE DEMO / cache). Dipakai saat Supabase belum dikonfigurasi.
import type { CampaignReport, LanguageConfig } from "@/lib/agents/schemas";

export type Profile = { namaUsaha: string; jenisUsaha: string; kota: string; bahasaDefault: LanguageConfig };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // penyimpanan penuh
  }
}

export const getProfile = () => read<Profile | null>("pa_profile", null);
export const saveProfile = (p: Profile) => write("pa_profile", p);

export const getCampaigns = () => read<CampaignReport[]>("pa_campaigns", []);
// Poster berupa data URL cukup besar, jadi buang kampanye terlama jika kuota penuh
export const saveCampaign = (c: CampaignReport) => {
  let all = [c, ...getCampaigns().filter((x) => x.id !== c.id)].slice(0, 12);
  while (all.length > 1 && !write("pa_campaigns", all)) all = all.slice(0, -1);
  if (all.length === 1) write("pa_campaigns", all);
};
export const getCampaign = (id: string) => getCampaigns().find((c) => c.id === id) ?? null;
export const deleteCampaign = (id: string) => write("pa_campaigns", getCampaigns().filter((c) => c.id !== id));

export type CsvUpload = { id: string; fileName: string; rows: Record<string, string>[]; createdAt: string };
export const getUploads = () => read<CsvUpload[]>("pa_uploads", []);
export const saveUpload = (u: CsvUpload) => write("pa_uploads", [u, ...getUploads()].slice(0, 5));
export const deleteUpload = (id: string) => write("pa_uploads", getUploads().filter((u) => u.id !== id));

export const getChecks = (id: string) => read<Record<string, boolean>>(`pa_checks_${id}`, {});
export const saveChecks = (id: string, v: Record<string, boolean>) => write(`pa_checks_${id}`, v);

export const getTip = () => read<{ date: string; text: string } | null>("pa_tip", null);
export const saveTip = (t: { date: string; text: string }) => write("pa_tip", t);
