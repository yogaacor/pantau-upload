import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Halaman yang boleh dibuka tanpa login. Tidak ada halaman /login
 * tersendiri — beranda "/" yang menampung tombol masuk, dan tombol itu
 * melompat langsung ke Google.
 */
const PUBLIC_PREFIXES = ["/auth", "/privacy", "/login"];
const PUBLIC_EXACT = ["/"];

export async function updateSession(request: NextRequest) {
  // Kalau Redirect URL belum terdaftar di Supabase, kode otorisasi
  // dilempar ke Site URL (akar situs) alih-alih ke /auth/callback.
  // Teruskan sendiri supaya login tetap selesai, bukan berhenti dengan
  // ?code= menggantung di URL.
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.searchParams.set("next", "/");
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Wajib dipanggil: menyegarkan token yang hampir kedaluwarsa.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
