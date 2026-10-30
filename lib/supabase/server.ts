import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieItem = { name: string; value: string; options: CookieOptions };
import { cookies } from "next/headers";

export function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const store = cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: CookieItem[]) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* dipanggil dari Server Component */ }
      },
    },
  });
}
