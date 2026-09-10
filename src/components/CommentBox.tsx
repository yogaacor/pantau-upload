"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CommentBox({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pesan, setPesan] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (!pesan.trim()) return;

    setBusy(true);
    setError(null);
    const res = await fetch(`/api/requests/${requestId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pesan }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(json.error ?? "Gagal mengirim");
      return;
    }
    setPesan("");
    router.refresh();
  }

  return (
    <form onSubmit={kirim} className="mt-4">
      <textarea
        className="input min-h-20 resize-y"
        value={pesan}
        onChange={(e) => setPesan(e.target.value)}
        placeholder="Tulis komentar…"
      />
      <div className="mt-2 flex items-center gap-3">
        <button className="btn-ghost" disabled={busy || !pesan.trim()}>
          {busy ? "Mengirim…" : "Kirim komentar"}
        </button>
        {error && <span className="text-xs text-rose-400">{error}</span>}
      </div>
    </form>
  );
}
