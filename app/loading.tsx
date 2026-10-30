import { Dots } from "@/components/ui/kit";

export default function Loading() {
  return <main className="bg-grid grid min-h-screen place-items-center"><div className="text-center"><Dots /><p className="mt-2 font-mono text-xs uppercase tracking-widest">Memuat...</p></div></main>;
}
