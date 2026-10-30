import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import type { TimingRow } from "./schemas";

export function normalizeRows(raw: Record<string, unknown>[]): TimingRow[] {
  return raw
    .map((r) => ({
      tanggal: String(r.tanggal ?? "").trim(),
      jam: String(r.jam ?? "").trim(),
      produk: String(r.produk ?? "").trim(),
      qty: Number(r.qty ?? 0),
      total_harga: Number(r.total_harga ?? 0),
    }))
    .filter((r) => r.tanggal && r.jam);
}

export async function loadSampleRows(): Promise<TimingRow[]> {
  const file = await readFile(path.join(process.cwd(), "data", "sample-transactions.csv"), "utf8");
  const parsed = Papa.parse<Record<string, unknown>>(file, { header: true, skipEmptyLines: true });
  return normalizeRows(parsed.data);
}
