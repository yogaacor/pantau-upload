"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

const ERROR_TEXT: Record<string, string> = {
  "tidak-terdaftar": "Login gagal disimpan. Coba ulangi.",
  nocode: "Proses login terputus. Coba ulangi.",
};

function LoginCard() {
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
    <div className="card w-full max-w-sm p-8">
      <div className="mb-1 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <span className="grid size-7 place-items-center rounded-md bg-brand-600 text-[13px] text-white">
          ▶
        </span>
        pantau<span className="-ml-2 text-ink-400">-upload</span>
      </div>
      <p className="mb-7 text-sm text-ink-400">
        Antrian permintaan upload video YouTube.
      </p>

      {message && (
        <p className="mb-5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
          {message}
        </p>
      )}

      <button
        onClick={signIn}
        disabled={loading}
        className="btn-ghost w-full py-2.5"
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

      <p className="mt-6 text-xs leading-relaxed text-ink-400">
        Belum punya akun? Tidak perlu mendaftar — masuk saja dengan Google,
        akunmu dibuat otomatis sebagai PIC.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <Suspense>
        <LoginCard />
      </Suspense>
    </main>
  );
}
