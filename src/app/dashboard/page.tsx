import Link from "next/link";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { formatBytes, timeAgo } from "@/lib/format";
import { STATUS_ORDER, type RequestRow, type Status } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("requests")
    .select("*")
    .eq("requester_id", profile.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as RequestRow[];
  const hitung = (s: Status) => rows.filter((r) => r.status === s).length;

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Request saya
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              {rows.length === 0
                ? "Belum ada request."
                : `${rows.length} request · ${hitung("selesai")} selesai · ${
                    hitung("baru") + hitung("diproses")
                  } masih berjalan`}
            </p>
          </div>
          {!profile.blocked && (
            <Link href="/dashboard/baru" className="btn-primary">
              + Request baru
            </Link>
          )}
        </div>

        {profile.blocked && (
          <p className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            Akunmu diblokir admin. Kamu masih bisa melihat request lama, tapi
            tidak bisa membuat atau mengubah apa pun. Hubungi admin kalau ini
            keliru.
          </p>
        )}

        {rows.some((r) => r.status === "revisi") && (
          <p className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            Ada request yang butuh revisi dari kamu. Buka detailnya untuk lihat
            catatan admin.
          </p>
        )}

        {rows.length === 0 ? (
          <div className="card grid place-items-center gap-3 p-14 text-center">
            <p className="text-sm text-ink-400">
              Belum ada permintaan upload. Mulai dari sini.
            </p>
            <Link href="/dashboard/baru" className="btn-ghost">
              Buat request pertama
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/request/${r.id}`}
                  className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition hover:border-ink-600 hover:bg-ink-850/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-ink-400">
                        {r.kode}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1.5 truncate font-medium">{r.judul}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {r.drive_file_id
                        ? `${r.drive_file_name} · ${formatBytes(r.drive_file_size)}`
                        : r.drive_deleted_at
                          ? "File sudah dibersihkan dari Drive"
                          : "Belum ada file — buka untuk upload"}
                      {" · "}
                      {timeAgo(r.updated_at)}
                    </p>
                  </div>

                  {r.youtube_url ? (
                    <span className="badge bg-emerald-500/10 text-emerald-300 ring-emerald-500/30">
                      Tayang
                    </span>
                  ) : !r.drive_file_id && !r.drive_deleted_at ? (
                    <span className="badge bg-amber-500/10 text-amber-300 ring-amber-500/30">
                      Perlu file
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {rows.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2 text-xs text-ink-400">
            {STATUS_ORDER.filter((s) => hitung(s) > 0).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <StatusBadge status={s} />
                <span>{hitung(s)}</span>
              </span>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
