import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) await getServerClient()?.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(`${origin}/onboarding`);
}
