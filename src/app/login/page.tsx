"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ERROR_TEXT: Record<string, string> = {
  "tidak-terdaftar": "Login gagal disimpan. Coba ulangi.",
  nocode: "Proses login terputus. Coba ulangi.",
};

const LANGKAH = [
  { no: "01", judul: "Kirim request", isi: "Isi detail video, unggah filenya" },
  { no: "02", judul: "Masuk Drive", isi: "Langsung ke folder admin" },
  { no: "03", judul: "Tayang", isi: "Link YouTube muncul di dashboard" },
];

/* ------------------------------------------------------------------ */
/* Panel kiri: kolase yang meniru tampilan aplikasi                    */
/* ------------------------------------------------------------------ */

function Showcase() {
  return (
    <div className="relative hidden overflow-hidden border-r border-ink-800 bg-ink-900 lg:flex lg:flex-col">
      {/* latar: gradien lembut + kisi titik */}
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute -top-32 -left-24 size-[30rem] rounded-full bg-brand-600/20 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute -right-32 bottom-0 size-[26rem] rounded-full bg-emerald-500/10 blur-3xl"
        style={{ animationDelay: "-6s" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--color-ink-600) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
        <div>
          <span className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-sm text-white shadow-lg shadow-brand-600/30">
              ▶
            </span>
            pantau<span className="-ml-2 text-ink-400">-upload</span>
          </span>

          <h1 className="mt-10 max-w-md text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
            Dari PIC ke kanal YouTube, tanpa pesan berantai.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-400">
            Satu tempat untuk mengirim video, memantau antrian, dan menerima
            link hasilnya.
          </p>
        </div>

        {/* kolase kartu */}
        <div className="relative my-10 max-w-md">
          {/* kartu 1 — baris request */}
          <div className="animate-float card bg-ink-850/90 p-4 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-ink-400">PU-0042</span>
              <span className="badge bg-amber-500/10 text-amber-300 ring-amber-500/30">
                <span className="size-1.5 rounded-full bg-amber-400" />
                Diproses
              </span>
            </div>
            <p className="mt-2 text-sm font-medium">
              Dokumentasi Final Turnamen
            </p>
            <p className="mt-0.5 text-[11px] text-ink-400">
              Divisi Media · 2 jam lalu
            </p>
          </div>

          {/* kartu 2 — progres upload */}
          <div
            className="animate-float card ml-10 -mt-2 bg-ink-850/90 p-4 shadow-2xl shadow-black/40 backdrop-blur"
            style={{ animationDelay: "-2.3s" }}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-ink-300">
                Mengirim ke Drive
              </span>
              <span className="text-[11px] text-ink-400">1,4 / 2,1 GB</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-800">
              <div className="animate-fill h-full rounded-full bg-brand-500" />
            </div>
            <p className="mt-2 truncate text-[11px] text-ink-400">
              2026-09-10_Media_Turnamen_PU-0042.mp4
            </p>
          </div>

          {/* kartu 3 — hasil tayang */}
          <div
            className="animate-float card mt-3 flex items-center gap-3 bg-ink-850/90 p-3.5 shadow-2xl shadow-black/40 backdrop-blur"
            style={{ animationDelay: "-4.6s" }}
          >
            <div className="grid h-11 w-[74px] shrink-0 place-items-center rounded-md bg-gradient-to-br from-rose-600/80 to-rose-500/40">
              <span className="text-xs text-white">▶</span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-emerald-400">Sudah tayang</p>
              <p className="truncate text-xs text-ink-300">
                youtube.com/watch?v=dQw4w9WgXcQ
              </p>
            </div>
          </div>
        </div>

        {/* tiga langkah */}
        <ol className="grid grid-cols-3 gap-4 border-t border-ink-800 pt-7">
          {LANGKAH.map((l) => (
            <li key={l.no}>
              <span className="font-mono text-[11px] text-brand-400">
                {l.no}
              </span>
              <p className="mt-1 text-xs font-medium text-ink-100">{l.judul}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
                {l.isi}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel kanan: kartu login                                            */
/* ------------------------------------------------------------------ */

function LoginPanel() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlError = params.get("error");
  const next = params.get("next") ?? "/";

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  const message = error ?? (urlError ? (ERROR_TEXT[urlError] ?? urlError) : null);

  return (
    <div className="flex flex-col justify-center px-6 py-14 sm:px-12">
      <div className="mx-auto w-full max-w-sm">
        {/* logo kecil, hanya di layar sempit ketika panel kiri disembunyikan */}
        <span className="mb-10 flex items-center gap-2 text-base font-semibold tracking-tight lg:hidden">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">
            ▶
          </span>
          pantau<span className="-ml-2 text-ink-400">-upload</span>
        </span>

        <h2 className="text-2xl font-semibold tracking-tight">Masuk</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">
          Pakai akun Google kamu. Tidak perlu mendaftar dulu — akun dibuat
          otomatis saat pertama kali masuk.
        </p>

        {message && (
          <p className="mt-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
            {message}
          </p>
        )}

        <button
          onClick={signIn}
          disabled={loading}
          className="btn-ghost mt-7 w-full py-3"
        >
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.29 9.14 4.75 12 4.75Z"
            />
          </svg>
          {loading ? "Mengalihkan…" : "Masuk dengan Google"}
        </button>

        <div className="mt-8 space-y-2.5 border-t border-ink-800 pt-7 text-xs text-ink-400">
          <p className="flex items-start gap-2.5">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
            File dikirim dari browsermu langsung ke Google Drive, tidak
            menumpuk di server.
          </p>
          <p className="flex items-start gap-2.5">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
            Upload terputus? Dilanjutkan dari byte terakhir, bukan diulang dari
            nol.
          </p>
        </div>

        <p className="mt-10 text-xs text-ink-400">
          <Link
            href="/privacy"
            className="underline underline-offset-2 transition hover:text-ink-100"
          >
            Kebijakan privasi
          </Link>
          <span className="mx-2">·</span>
          <Link
            href="/"
            className="underline underline-offset-2 transition hover:text-ink-100"
          >
            Beranda
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-2">
      <Showcase />
      <Suspense>
        <LoginPanel />
      </Suspense>
    </main>
  );
}
