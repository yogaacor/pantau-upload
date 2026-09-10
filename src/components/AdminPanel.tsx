"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL, type RequestRow, type Status } from "@/lib/types";

const ALUR: { status: Status; help: string }[] = [
  { status: "diproses", help: "Sedang kamu kerjakan" },
  { status: "revisi", help: "Balikkan ke PIC dengan catatan" },
  { status: "ditolak", help: "Tidak jadi diupload" },
];

export function AdminPanel({ row }: { row: RequestRow }) {
  const router = useRouter();
  const [youtube, setYoutube] = useState(row.youtube_url ?? "");
  const [pesan, setPesan] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(
    label: string,
    url: string,
    body: Record<string, unknown>,
  ) {
    setBusy(label);
    setError(null);
    const res = await fetch(url, {
      method: url.includes("/api/requests/") ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(json.error ?? "Gagal");
      return false;
    }
    setPesan("");
    router.refresh();
    return true;
  }

  const ubahStatus = (status: Status) =>
    call(status, `/api/requests/${row.id}`, { status, pesan });

  const simpanLink = () =>
    call("link", `/api/requests/${row.id}`, { youtube_url: youtube });

  const tandaiSelesai = () =>
    call("selesai", `/api/requests/${row.id}`, {
      youtube_url: youtube,
      status: "selesai",
      pesan,
    });

  async function hapusDrive() {
    const ok = window.confirm(
      "Hapus file mentah ini dari Drive? Link YouTube tetap tersimpan, tapi file aslinya hilang permanen.",
    );
    if (!ok) return;
    await call("hapus", "/api/drive/delete", {
      requestId: row.id,
      includeThumb: true,
    });
  }

  return (
    <div className="card divide-y divide-ink-800">
      <div className="p-5">
        <h2 className="mb-1 text-sm font-semibold">Selesaikan request</h2>
        <p className="mb-4 text-xs text-ink-400">
          Upload videonya manual di YouTube Studio, lalu tempel linknya di sini.
        </p>

        <label className="label" htmlFor="yt">
          Link YouTube
        </label>
        <input
          id="yt"
          className="input"
          value={youtube}
          onChange={(e) => setYoutube(e.target.value)}
          placeholder="https://youtu.be/… atau https://youtube.com/watch?v=…"
        />

        <label className="label mt-4" htmlFor="pesan">
          Catatan (opsional)
        </label>
        <textarea
          id="pesan"
          className="input min-h-20 resize-y"
          value={pesan}
          onChange={(e) => setPesan(e.target.value)}
          placeholder="Muncul di riwayat dan dibaca PIC"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn-primary"
            disabled={!youtube.trim() || busy !== null}
            onClick={tandaiSelesai}
          >
            {busy === "selesai" ? "Menyimpan…" : "Tandai selesai"}
          </button>
          <button
            className="btn-ghost"
            disabled={!youtube.trim() || busy !== null}
            onClick={simpanLink}
          >
            {busy === "link" ? "Menyimpan…" : "Simpan link saja"}
          </button>
        </div>
      </div>

      <div className="p-5">
        <h2 className="mb-3 text-sm font-semibold">Ubah status</h2>
        <div className="flex flex-wrap gap-2">
          {ALUR.filter((a) => a.status !== row.status).map((a) => (
            <button
              key={a.status}
              className="btn-ghost"
              title={a.help}
              disabled={busy !== null}
              onClick={() => ubahStatus(a.status)}
            >
              {busy === a.status ? "…" : STATUS_LABEL[a.status]}
            </button>
          ))}
        </div>
      </div>

      {row.status === "selesai" && row.drive_file_id && (
        <div className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Bersihkan Drive</h2>
          <p className="mb-3 text-xs text-ink-400">
            Videonya sudah tayang, file mentahnya tidak perlu disimpan lagi.
            Menghapusnya membebaskan kuota Drive kamu.
          </p>
          <button
            className="btn-danger"
            disabled={busy !== null}
            onClick={hapusDrive}
          >
            {busy === "hapus" ? "Menghapus…" : "Hapus file dari Drive"}
          </button>
        </div>
      )}

      {error && (
        <p className="bg-rose-500/10 px-5 py-3 text-sm text-rose-300">{error}</p>
      )}
    </div>
  );
}
