import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { MembersManager } from "@/components/MembersManager";
import {
  AllowlistManager,
  type AllowlistRow,
} from "@/components/AllowlistManager";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AnggotaPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: profileRows }, { data: allow }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("allowlist").select("*").order("created_at"),
  ]);

  const members = (profileRows ?? []) as Profile[];
  const sudahLogin = new Set(members.map((m) => m.email.toLowerCase()));

  const rows: AllowlistRow[] = (allow ?? []).map((a) => ({
    email: a.email as string,
    role: a.role as Role,
    divisi: (a.divisi as string | null) ?? null,
    terdaftar: sudahLogin.has((a.email as string).toLowerCase()),
  }));

  const diblokir = members.filter((m) => m.blocked).length;

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Anggota</h1>
        <p className="mt-1 mb-8 text-sm text-ink-400">
          Pendaftaran terbuka — siapa pun yang masuk dengan Google langsung
          menjadi PIC. {members.length} anggota
          {diblokir > 0 ? `, ${diblokir} diblokir` : ""}.
        </p>

        <MembersManager members={members} selfId={profile.id} />

        <div className="mt-12">
          <h2 className="text-lg font-medium tracking-tight">
            Tetapkan admin lebih awal
          </h2>
          <p className="mt-1 mb-5 text-sm text-ink-400">
            Daftar ini bukan gerbang masuk. Gunanya menetapkan peran dan divisi
            sebelum orangnya pertama kali login — berguna kalau kamu ingin
            seseorang langsung menjadi admin begitu ia masuk. Untuk anggota yang
            sudah pernah login, ubah perannya di tabel atas saja.
          </p>

          <AllowlistManager rows={rows} selfEmail={profile.email} />
        </div>
      </main>
    </>
  );
}
