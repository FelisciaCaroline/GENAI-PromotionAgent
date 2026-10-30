import "server-only";
import { generateObject } from "ai";
import { getGroq } from "@/lib/ai/groq";
import { MODELS } from "@/lib/ai/models";
import { STYLES } from "@/lib/ai/styles";
import { withRetry } from "@/lib/utils/retry";
import { PlanSchema, type Plan } from "./schemas";

// Supervisor: pecah 1 kalimat tujuan menjadi rencana + 4 tugas
export async function runSupervisor(goal: string, businessHint?: string): Promise<Plan> {
  const { object } = await withRetry(() =>
    generateObject({
      model: getGroq()(MODELS.smart),
      mode: "json",
      schema: PlanSchema,
      system: `Kamu Supervisor Agent untuk PromoAgent AI. Tugasmu memahami tujuan promosi UMKM dari satu kalimat lalu menyusun rencana terstruktur. Gunakan Bahasa Indonesia. Jika informasi tidak ada, buat asumsi wajar dan konservatif (jangan mengarang harga pasti). tasks harus berisi tepat: "timing", "copywriting", "video_script", "design". gayaBahasaSaran harus salah satu id: ${STYLES.map((s) => s.id).join(", ")}. Jika target audiens asing/turis, sarankan languageSuggestion yang sesuai (kode: id, en, jv, su, ms, zh, ja, ko, ar, es, fr, de, pt, hi, th); jika tidak, gunakan primary "id", secondary [], mixMode "single". headline maksimal 5 kata.`,
      prompt: `Tujuan promo: ${goal}${businessHint ? `\nProfil usaha: ${businessHint}` : ""}`,
    })
  );
  return object;
}
