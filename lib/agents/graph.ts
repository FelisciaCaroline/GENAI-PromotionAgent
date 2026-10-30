import "server-only";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import { friendlyError } from "@/lib/utils/retry";
import { compileReport } from "./compiler";
import { runCopywriter } from "./copywriter-agent";
import { runDataAgent } from "./data-agent";
import { runPosterSet } from "./designer-agent";
import { loadSampleRows } from "./sample-data";
import {
  type AgentEvent, type CampaignReport, type CopyResult, type DesignResult,
  type LanguageConfig, type Plan, type TimingResult, type TimingRow,
} from "./schemas";
import { runSupervisor } from "./supervisor";
import type { Ratio } from "@/lib/image/compose";

export type CampaignInput = {
  id: string;
  goal: string;
  languageConfig: LanguageConfig;
  businessHint?: string;
  csvRows?: TimingRow[];
  photoBase64?: string | null;
};

const State = Annotation.Root({
  input: Annotation<CampaignInput>(),
  plan: Annotation<Plan | null>({ reducer: (_a, b) => b, default: () => null }),
  timing: Annotation<TimingResult | null>({ reducer: (_a, b) => b, default: () => null }),
  copy: Annotation<CopyResult | null>({ reducer: (_a, b) => b, default: () => null }),
  design: Annotation<DesignResult | null>({ reducer: (_a, b) => b, default: () => null }),
  errors: Annotation<string[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  report: Annotation<CampaignReport | null>({ reducer: (_a, b) => b, default: () => null }),
});
type S = typeof State.State;

const emitOf = (cfg?: RunnableConfig) =>
  (cfg?.configurable?.emit as ((e: AgentEvent) => void) | undefined) ?? (() => {});

async function supervisorNode(s: S, cfg?: RunnableConfig) {
  const emit = emitOf(cfg);
  emit({ agent: "supervisor", status: "running", message: "Membaca tujuan dan memecahnya jadi 4 tugas..." });
  try {
    const plan = await runSupervisor(s.input.goal, s.input.businessHint);
    emit({ agent: "supervisor", status: "done", message: `Rencana siap: ${plan.tujuan} untuk ${plan.produk}.` });
    return { plan };
  } catch (e) {
    console.error("[agent:supervisor]", e);
    emit({ agent: "supervisor", status: "error", message: friendlyError(e) });
    return { errors: ["supervisor: " + friendlyError(e)] };
  }
}

async function timingNode(s: S, cfg?: RunnableConfig) {
  const emit = emitOf(cfg);
  emit({ agent: "timing", status: "running", message: "Menganalisis pola transaksi..." });
  try {
    const rows = s.input.csvRows?.length ? s.input.csvRows : await loadSampleRows();
    const timing = await runDataAgent(rows);
    emit({ agent: "timing", status: "done", message: `Waktu emas: ${timing.recommendation.bestDay} ${timing.recommendation.bestHour}.` });
    return { timing };
  } catch (e) {
    console.error("[agent:timing]", e);
    emit({ agent: "timing", status: "error", message: friendlyError(e) });
    return { errors: ["timing: " + friendlyError(e)] };
  }
}

async function copywriterNode(s: S, cfg?: RunnableConfig) {
  const emit = emitOf(cfg);
  emit({ agent: "copywriter", status: "running", message: "Menulis caption dan naskah video..." });
  try {
    const plan = s.plan;
    const waktu = s.timing ? `${s.timing.recommendation.bestDay} ${s.timing.recommendation.bestHour}` : plan?.periodeWaktu;
    const copy = await runCopywriter({
      goal: s.input.goal,
      produk: plan?.produk ?? s.input.goal,
      target: plan?.targetAudiens ?? "pelanggan umum",
      penawaran: plan?.penawaran ?? "promo spesial",
      waktuPromo: waktu,
      languageConfig: s.input.languageConfig,
    });
    emit({ agent: "copywriter", status: "done", message: `${copy.variants.length} varian teks selesai.` });
    return { copy };
  } catch (e) {
    console.error("[agent:copywriter]", e);
    emit({ agent: "copywriter", status: "error", message: friendlyError(e) });
    return { errors: ["copywriter: " + friendlyError(e)] };
  }
}

async function designerNode(s: S, cfg?: RunnableConfig) {
  const emit = emitOf(cfg);
  emit({ agent: "designer", status: "running", message: "Membuat 3 konsep poster (hapus background, latar, layout)..." });
  try {
    const plan = s.plan;
    const photo = s.input.photoBase64 ? Buffer.from(s.input.photoBase64, "base64") : null;
    const set = await runPosterSet({
      photo,
      goal: s.input.goal,
      produk: plan?.produk ?? s.input.goal,
      target: plan?.targetAudiens ?? "pelanggan umum",
      penawaran: plan?.penawaran ?? "promo spesial",
      periode: plan?.periodeWaktu ?? "periode terbatas",
      ratio: "4:5" as Ratio,
      bgMode: "ai",
      languageConfig: s.input.languageConfig,
    });
    const ok = set.posters.filter((p) => p.url);
    if (ok.length === 0) throw new Error("Semua poster gagal dibuat");
    emit({ agent: "designer", status: "done", message: `${ok.length} poster selesai${set.note ? `. ${set.note}` : "."}` });
    const design: DesignResult = {
      posterUrl: ok[0].url,
      cutoutUsed: set.cutoutUsed,
      bgPrompt: ok[0].concept.bgPrompt,
      note: set.note,
      kategori: set.kategori,
      musiman: set.musiman,
      posters: set.posters,
    };
    return { design };
  } catch (e) {
    console.error("[agent:designer]", e);
    emit({ agent: "designer", status: "error", message: friendlyError(e) });
    return { errors: ["designer: " + friendlyError(e)] };
  }
}

async function compilerNode(s: S, cfg?: RunnableConfig) {
  const emit = emitOf(cfg);
  emit({ agent: "compiler", status: "running", message: "Menyusun laporan kampanye..." });
  const report = compileReport({
    id: s.input.id, goal: s.input.goal, languageConfig: s.input.languageConfig,
    plan: s.plan, timing: s.timing, copy: s.copy, design: s.design, errors: s.errors,
  });
  emit({ agent: "compiler", status: "done", message: "Laporan siap dibuka." });
  return { report };
}

// START -> supervisor -> timingAgent -> [copywriter || designer] -> compiler -> END
export function buildGraph() {
  return new StateGraph(State)
    .addNode("supervisor", supervisorNode)
    .addNode("timingAgent", timingNode) // nama node tidak boleh sama dengan key state
    .addNode("copywriter", copywriterNode)
    .addNode("designer", designerNode)
    .addNode("compiler", compilerNode)
    .addEdge(START, "supervisor")
    .addEdge("supervisor", "timingAgent")
    .addEdge("timingAgent", "copywriter")
    .addEdge("timingAgent", "designer")
    .addEdge(["copywriter", "designer"], "compiler")
    .addEdge("compiler", END)
    .compile();
}
