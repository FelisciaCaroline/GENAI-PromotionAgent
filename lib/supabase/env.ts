// MODE DEMO: jika env Supabase kosong, aplikasi tetap jalan memakai penyimpanan browser
export const supabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
