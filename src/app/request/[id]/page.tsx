import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { StatusBadge } from "@/components/StatusBadge";
import { DriveUploader } from "@/components/DriveUploader";
import { JenisBadge } from "@/components/JenisBadge";
import { AdminPanel } from "@/components/AdminPanel";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { driveViewUrl } from "@/lib/google";
import {
  formatBytes,
  formatDateTime,
  timeAgo,
  youtubeThumb,
} from "@/lib/format";
import type {
  RequestEvent,
  RequestWithRequester,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const EVENT_DOT: Record<string, string> = {
  dibuat: "bg-sky-400",
  status: "bg-amber-400",
  komentar: "bg-ink-400",
  file: "bg-brand-400",
  youtube: "bg-emerald-400",
  drive_hapus: "bg-rose-400",
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getSessionProfile();
  if (!profile) redirect("/");

  const supabase = await createClient();

  const { data } = await supabase
    .from("requests")
    .select("*, requester:profiles!requests_requester_id_fkey(id, full_name, email, divisi)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const row = data as RequestWithRequester;

  const { data: eventData } = await supabase
    .from("request_events")
    .select("*")
    .eq("request_id", id)
    .order("created_at", { ascending: true });

  const events = (eventData ?? []) as RequestEvent[];

  const isAdmin = profile.role === "admin";
  const isOwner = row.requester_id === profile.id;
  const dapatEdit = isOwner && (row.status === "baru" || row.status === "revisi");

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link
          href={isAdmin ? "/admin" : "/dashboard"}
          className="btn-back"
        >
          ← {isAdmin ? "Antrian" : "Request saya"}
        </Link>

        <div className="mt-3 mb-7 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-ink-400">{row.kode}</span>
              <StatusBadge status={row.status} />
              <JenisBadge jenis={row.jenis} />
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {row.judul}
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              {row.requester?.full_name ?? row.requester?.email ?? "—"}
              {row.requester?.divisi ? ` · ${row.requester.divisi}` : ""} ·
              dibuat {timeAgo(row.created_at)}
            </p>
          </div>

          {dapatEdit && (
            <Link href={`/request/${row.id}/ubah`} className="btn-ghost">
              Ubah detail
            </Link>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* ---------------- kolom kiri ---------------- */}
          <div className="space-y-6">
            {row.youtube_video_id && (
              <a
                href={row.youtube_url!}
                target="_blank"
                rel="noreferrer"
                className="card flex items-center gap-4 p-4 transition hover:border-ink-600"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={youtubeThumb(row.youtube_video_id)}
                  alt=""
                  className="h-16 w-28 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0">
                  <p className="text-xs text-emerald-400">Sudah tayang</p>
                  <p className="truncate text-sm text-ink-100">
                    {row.youtube_url}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {formatDateTime(row.published_at)}
                  </p>
                </div>
              </a>
            )}

            <div className="card p-5">
              <h2 className="mb-4 text-sm font-semibold">
                {row.jenis === "zoom"
                  ? "Berkas rekaman Zoom (belum dikonversi)"
                  : "File video"}
              </h2>

              {row.jenis === "zoom" && (
                <p className="mb-4 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3.5 py-3 text-xs leading-relaxed text-violet-200">
                  Kiriman ini berupa rekaman mentah. Admin yang akan
                  mengonversinya lebih dulu, lalu mengunggahnya ke YouTube —
                  jadi prosesnya bisa lebih lama dari kiriman video jadi.
                </p>
              )}

              {row.drive_file_id ? (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ink-800 bg-ink-850/50 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{row.drive_file_name}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {formatBytes(row.drive_file_size)} · {row.drive_mime}
                    </p>
                  </div>
                  <a
                    href={driveViewUrl(row.drive_file_id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                  >
                    Buka di Drive
                  </a>
                </div>
              ) : row.drive_deleted_at ? (
                <p className="rounded-lg border border-ink-800 bg-ink-850/50 p-3.5 text-sm text-ink-400">
                  File mentah sudah dihapus dari Drive pada{" "}
                  {formatDateTime(row.drive_deleted_at)} — videonya sudah tayang
                  di YouTube.
                </p>
              ) : (
                <p className="mb-4 text-sm text-ink-400">
                  Belum ada file. Upload di bawah ini; file akan langsung masuk
                  ke folder Drive admin.
                </p>
              )}

              {(dapatEdit || (isAdmin && !row.drive_deleted_at)) && (
                <div className="mt-4">
                  <DriveUploader
                    requestId={row.id}
                    jenis={row.jenis}
                    currentName={row.drive_file_name}
                    currentSize={row.drive_file_size}
                  />
                </div>
              )}
            </div>

            {row.catatan && (
              <div className="card p-5">
                <h2 className="mb-2 text-sm font-semibold">Catatan dari PIC</h2>
                <p className="text-sm whitespace-pre-wrap text-ink-300">
                  {row.catatan}
                </p>
              </div>
            )}

            <div className="card p-5">
              <h2 className="mb-4 text-sm font-semibold">Riwayat</h2>
              <ol className="space-y-4">
                {events.map((ev) => (
                  <li key={ev.id} className="flex gap-3">
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        EVENT_DOT[ev.type] ?? "bg-ink-600"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm whitespace-pre-wrap text-ink-300">
                        {ev.message}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {ev.actor_name ?? "Sistem"} · {timeAgo(ev.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
                {events.length === 0 && (
                  <li className="text-sm text-ink-400">Belum ada aktivitas.</li>
                )}
              </ol>
            </div>
          </div>

          {/* ---------------- kolom kanan ---------------- */}
          <aside className="space-y-6">
            {isAdmin ? (
              <AdminPanel row={row} />
            ) : (
              <div className="card p-5">
                <h2 className="mb-3 text-sm font-semibold">Status</h2>
                <StatusBadge status={row.status} />
                <p className="mt-3 text-xs leading-relaxed text-ink-400">
                  {row.status === "baru" &&
                    (row.drive_file_id
                      ? "File sudah masuk. Tinggal tunggu admin memprosesnya."
                      : "Upload file videonya dulu supaya bisa diproses admin.")}
                  {row.status === "diproses" &&
                    "Admin sedang mengupload video ini ke YouTube."}
                  {row.status === "revisi" &&
                    "Admin minta perbaikan. Cek riwayat di bawah, lalu upload ulang filenya."}
                  {row.status === "selesai" &&
                    "Video sudah tayang. Linknya ada di atas."}
                  {row.status === "ditolak" &&
                    "Request ini tidak dilanjutkan. Alasannya ada di riwayat."}
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
