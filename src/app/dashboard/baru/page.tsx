import Link from "next/link";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { RequestForm } from "@/components/RequestForm";
import { getSessionProfile } from "@/lib/supabase/server";

export default async function RequestBaruPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.blocked) redirect("/dashboard");

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/dashboard"
          className="text-sm text-ink-400 transition hover:text-ink-100"
        >
          ← Kembali
        </Link>

        <h1 className="mt-3 mb-1 text-2xl font-semibold tracking-tight">
          Buat request upload
        </h1>
        <p className="mb-7 text-sm text-ink-400">
          Isi detail videonya dulu. Setelah tersimpan, kamu langsung diarahkan
          ke halaman upload file.
        </p>

        <RequestForm />
      </main>
    </>
  );
}
