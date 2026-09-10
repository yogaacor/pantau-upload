"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Membatalkan berkas yang terlanjur salah unggah. Berkasnya ikut dihapus
 * dari Drive supaya tidak menyisakan sampah di folder admin.
 */
export function HapusBerkasButton({
  requestId,
  kind = "video",
  fileName,
}: {
  requestId: string;
  kind?: "video" | "thumb";
  fileName?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function hapus() {
    const ok = window.confirm(
      `Hapus ${fileName ?? "berkas ini"}? Berkasnya dihapus dari Drive dan kamu bisa mengunggah ulang.`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);

    const res = await fetch("/api/drive/detach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, kind }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(json.error ?? "Gagal menghapus");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button onClick={hapus} disabled={busy} className="btn-danger">
        {busy ? "Menghapus…" : "Hapus berkas"}
      </button>
      {error && <p className="mt-2 w-full text-xs text-rose-400">{error}</p>}
    </>
  );
}
