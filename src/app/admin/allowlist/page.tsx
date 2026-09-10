import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import {
  AllowlistManager,
  type AllowlistRow,
} from "@/components/AllowlistManager";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AllowlistPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: allow }, { data: profiles }] = await Promise.all([
    supabase.from("allowlist").select("*").order("created_at"),
    supabase.from("profiles").select("email"),
  ]);

  const sudahLogin = new Set(
    (profiles ?? []).map((p) => (p.email as string).toLowerCase()),
  );

  const rows: AllowlistRow[] = (allow ?? []).map((a) => ({
    email: a.email as string,
    role: a.role as Role,
    divisi: (a.divisi as string | null) ?? null,
    terdaftar: sudahLogin.has((a.email as string).toLowerCase()),
  }));

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Anggota</h1>
        <p className="mt-1 mb-7 text-sm text-ink-400">
          Hanya email di daftar ini yang bisa masuk. Tambahkan dulu emailnya,
          baru orangnya bisa login pakai Google.
        </p>

        <AllowlistManager rows={rows} selfEmail={profile.email} />
      </main>
    </>
  );
}
