import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getServerClient } from "@/lib/supabase/server";

type Ctx = { params: { id: string } };

export async function GET(_: Request, { params }: Ctx) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Mode demo: data ada di browser." }, { status: 404 });
  const sb = getServerClient();
  const { data, error } = (await sb?.from("campaigns").select("report").eq("id", params.id).single()) ?? { data: null, error: true };
  if (error || !data) return NextResponse.json({ error: "Kampanye tidak ditemukan." }, { status: 404 });
  return NextResponse.json(data.report);
}

export async function DELETE(_: Request, { params }: Ctx) {
  if (!supabaseConfigured()) return NextResponse.json({ ok: true });
  const sb = getServerClient();
  await sb?.from("campaigns").delete().eq("id", params.id);
  return NextResponse.json({ ok: true });
}
