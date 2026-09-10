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
    console.error("[Auth Callback Error]:", error);
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(error.message || "tidak-terdaftar")}`,
    );
  }

  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
}
