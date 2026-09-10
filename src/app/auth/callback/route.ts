import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=nocode`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Trigger handle_new_user() menolak email di luar allowlist, dan
    // penolakan itu muncul sebagai error di sini.
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent("tidak-terdaftar")}`,
    );
  }

  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
}
