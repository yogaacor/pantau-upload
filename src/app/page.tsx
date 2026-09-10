import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { getSessionProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ERROR_TEXT: Record<string, string> = {
  "tidak-terdaftar": "Login gagal disimpan. Coba ulangi.",
  nocode: "Proses login terputus. Coba ulangi.",
};

const LANGKAH = [
  {
    judul: "PIC mengirim request",
    isi: "Isi judul, deskripsi, tag, dan jadwal tayang yang diinginkan, lalu unggah file videonya langsung dari browser.",
  },
  {
    judul: "File masuk ke Drive",
    isi: "Video dikirim langsung ke folder Google Drive admin, dengan penamaan yang seragam supaya gampang dicari.",
  },
  {
    judul: "Admin mengunggah ke YouTube",
    isi: "Admin membuka file dari antrian, mengunggahnya lewat YouTube Studio, lalu menempelkan link hasilnya.",
  },
  {
    judul: "PIC melihat hasilnya",
    isi: "Status dan link YouTube muncul di dashboard PIC, lengkap dengan riwayat dan catatan revisi.",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const profile = await getSessionProfile();
  if (profile) redirect(profile.role === "admin" ? "/admin" : "/dashboard");

  const { error, next } = await searchParams;
  const message = error ? (ERROR_TEXT[error] ?? error) : null;
  // "/login" sudah tidak ada; tautan lama yang masih menunjuk ke sana
  // diarahkan ke beranda supaya tidak memantul percuma setelah login.
  const tujuan =
    next?.startsWith("/") && !next.startsWith("/login") ? next : "/";

  return (
    <div className="min-h-dvh">
      <header className="border-b border-ink-800">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-md bg-brand-600 text-[13px] text-white">
              ▶
            </span>
            pantau<span className="-ml-2 text-ink-400">-upload</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-sm text-brand-400">Alat kerja internal</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Antrian permintaan upload video YouTube
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-300">
          pantau-upload merapikan alur dari PIC ke kanal YouTube: satu tempat
          untuk mengirim video, memantau statusnya, dan menerima link hasilnya
        </p>

        {message && (
          <p className="mt-7 max-w-md rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
            {message}
          </p>
        )}

        <div className="mt-8 max-w-xs">
          <GoogleSignInButton next={tujuan} variant="primary" />
        </div>


        <ol className="mt-16 grid gap-4 sm:grid-cols-2">
          {LANGKAH.map((l, i) => (
            <li key={l.judul} className="card p-5">
              <span className="text-xs text-ink-400">
                Langkah {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-1.5 font-medium">{l.judul}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">
                {l.isi}
              </p>
            </li>
          ))}
        </ol>
      </main>

      <footer className="border-t border-ink-800">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 text-xs text-ink-400">
          <span>pantau-upload</span>
          <Link href="/privacy" className="transition hover:text-ink-100">
            Kebijakan privasi
          </Link>
        </div>
      </footer>
    </div>
  );
}
