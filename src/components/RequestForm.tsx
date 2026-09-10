"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RequestRow } from "@/lib/types";

type Values = {
  judul: string;
  catatan: string;
};

export function RequestForm({ existing }: { existing?: RequestRow }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [v, setV] = useState<Values>({
    judul: existing?.judul ?? "",
    catatan: existing?.catatan ?? "",
  });

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      judul: v.judul,
      deskripsi: existing?.deskripsi ?? null,
      catatan: v.catatan,
      privacy: existing?.privacy ?? "public",
      tags: existing?.tags ?? [],
      kategori: existing?.kategori ?? null,
      jadwal_tayang: existing?.jadwal_tayang ?? null,
      ck_final: true,
      ck_resolusi: true,
      ck_audio: true,
      ck_copyright: true,
    };

    const res = await fetch(
      existing ? `/api/requests/${existing.id}` : "/api/requests",
      {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Gagal menyimpan");
      setSaving(false);
      return;
    }

    router.push(`/request/${existing?.id ?? json.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Detail video</h2>

        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="judul">
                Judul video *
              </label>
              <span className="text-xs text-ink-400">
                {v.judul.length}/100 karakter
              </span>
            </div>
            <input
              id="judul"
              className="input"
              required
              maxLength={100}
              value={v.judul}
              onChange={(e) => set("judul", e.target.value)}
              placeholder="Pelatihan & Sertifikasi BNSP_H2S_31 MARET - 1 APRIL 2026_PIC Nadifa"
            />
            <p className="mt-1.5 text-xs text-ink-400">
              <span className="font-medium text-ink-300">Contoh format:</span>{" "}
              Pelatihan &amp; Sertifikasi BNSP_H2S_31 MARET - 1 APRIL 2026_PIC Nadifa
            </p>
          </div>

          <div>
            <label className="label" htmlFor="catatan">
              Catatan untuk admin
            </label>
            <textarea
              id="catatan"
              className="input min-h-20 resize-y"
              value={v.catatan}
              onChange={(e) => set("catatan", e.target.value)}
              placeholder="Hal khusus yang perlu diperhatikan saat upload"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={saving}>
          {saving
            ? "Menyimpan…"
            : existing
              ? "Simpan perubahan"
              : "Buat request & lanjut upload"}
        </button>
      </div>
    </form>
  );
}
