import Link from "next/link";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { driveViewUrl } from "@/lib/google";
import { formatBytes, timeAgo } from "@/lib/format";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  type RequestWithRequester,
  type Status,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const { status, q } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("requests")
    .select("*, requester:profiles!requests_requester_id_fkey(id, full_name, email, divisi)")
    .order("created_at", { ascending: false });

  const semua = (data ?? []) as RequestWithRequester[];
  const hitung = (s: Status) => semua.filter((r) => r.status === s).length;

  const keyword = q?.toLowerCase().trim();
  const rows = semua.filter((r) => {
    if (status && r.status !== status) return false;
    if (!keyword) return true;
    return (
      r.judul.toLowerCase().includes(keyword) ||
      (r.kode ?? "").toLowerCase().includes(keyword) ||
      (r.requester?.full_name ?? "").toLowerCase().includes(keyword) ||
      (r.requester?.divisi ?? "").toLowerCase().includes(keyword)
    );
  });

  const antre = semua.filter(
    (r) => r.status === "baru" && r.drive_file_id !== null,
  ).length;

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Antrian upload</h1>
        <p className="mt-1 mb-6 text-sm text-ink-400">
          {antre > 0
            ? `${antre} request siap dikerjakan — filenya sudah ada di Drive.`
            : "Tidak ada yang siap dikerjakan saat ini."}
        </p>

        {/* filter */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <FilterChip
            href="/admin"
            active={!status}
            label="Semua"
            count={semua.length}
          />
          {STATUS_ORDER.map((s) => (
            <FilterChip
              key={s}
              href={`/admin?status=${s}`}
              active={status === s}
              label={STATUS_LABEL[s]}
              count={hitung(s)}
            />
          ))}

          <form className="ml-auto" action="/admin">
            {status && <input type="hidden" name="status" value={status} />}
            <input
              name="q"
              defaultValue={q ?? ""}
              className="input w-56"
              placeholder="Cari judul, kode, PIC…"
            />
          </form>
        </div>

        {rows.length === 0 ? (
          <div className="card grid place-items-center p-14 text-sm text-ink-400">
            Tidak ada request yang cocok.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-ink-800 text-left text-xs text-ink-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Request</th>
                    <th className="px-4 py-3 font-medium">PIC</th>
                    <th className="px-4 py-3 font-medium">File</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Update</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800/70">
                  {rows.map((r) => (
                    <tr key={r.id} className="transition hover:bg-ink-850/50">
                      <td className="max-w-xs px-4 py-3">
                        <Link href={`/request/${r.id}`} className="block">
                          <span className="font-mono text-xs text-ink-400">
                            {r.kode}
                          </span>
                          <span className="mt-0.5 block truncate font-medium text-ink-100">
                            {r.judul}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-300">
                        <span className="block truncate">
                          {r.requester?.full_name ?? r.requester?.email ?? "—"}
                        </span>
                        <span className="block text-xs text-ink-400">
                          {r.requester?.divisi ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.drive_file_id ? (
                          <a
                            href={driveViewUrl(r.drive_file_id)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-400 underline-offset-2 hover:underline"
                          >
                            Buka Drive
                            <span className="block text-xs text-ink-400">
                              {formatBytes(r.drive_file_size)}
                            </span>
                          </a>
                        ) : r.drive_deleted_at ? (
                          <span className="text-xs text-ink-400">
                            sudah dibersihkan
                          </span>
                        ) : (
                          <span className="text-xs text-amber-400">
                            belum ada
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-400">
                        {timeAgo(r.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.youtube_url ? (
                          <a
                            href={r.youtube_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-emerald-400 underline-offset-2 hover:underline"
                          >
                            Lihat YouTube
                          </a>
                        ) : (
                          <Link
                            href={`/request/${r.id}`}
                            className="text-xs text-ink-300 underline-offset-2 hover:underline"
                          >
                            Kerjakan
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-brand-500/50 bg-brand-500/10 text-brand-400"
          : "border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600"
      }`}
    >
      {label}
      <span className="ml-1.5 text-ink-400">{count}</span>
    </Link>
  );
}
