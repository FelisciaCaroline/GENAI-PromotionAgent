import "server-only";
import { createClient } from "@supabase/supabase-js";

// Upload poster ke Storage (service role, hanya server). Return null jika belum dikonfigurasi.
export async function uploadPoster(dataUrl: string, name: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const sb = createClient(url, key);
    const buf = Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
    const path = `${name}.jpg`;
    const { error } = await sb.storage.from("campaign-posters").upload(path, buf, { contentType: "image/jpeg", upsert: true });
    if (error) return null;
    return sb.storage.from("campaign-posters").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
