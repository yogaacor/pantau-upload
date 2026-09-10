"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PRIVACY_LABEL, type Privacy, type RequestRow } from "@/lib/types";

const CHECKS = [
  { key: "ck_final", label: "File ini versi final, bukan draft" },
  { key: "ck_resolusi", label: "Resolusi minimal 1080p" },
  { key: "ck_audio", label: "Audio sudah dicek (tidak pecah / tidak senyap)" },
  {
    key: "ck_copyright",
    label: "Musik & footage aman hak cipta, atau sudah berizin",
  },
] as const;

type Values = {
  judul: string;
  deskripsi: string;
  tags: string;
  kategori: string;
  privacy: Privacy;
  jadwal_tayang: string;
  catatan: string;
  ck_final: boolean;
  ck_resolusi: boolean;
  ck_audio: boolean;
  ck_copyright: boolean;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function RequestForm({ existing }: { existing?: RequestRow }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [v, setV] = useState<Values>({
    judul: existing?.judul ?? "",
    deskripsi: existing?.deskripsi ?? "",
    tags: existing?.tags?.join(", ") ?? "",
    kategori: existing?.kategori ?? "",
    privacy: existing?.privacy ?? "public",
    jadwal_tayang: toLocalInput(existing?.jadwal_tayang ?? null),
    catatan: existing?.catatan ?? "",
    ck_final: existing?.ck_final ?? false,
    ck_resolusi: existing?.ck_resolusi ?? false,
    ck_audio: existing?.ck_audio ?? false,
    ck_copyright: existing?.ck_copyright ?? false,
  });

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  const allChecked = CHECKS.every((c) => v[c.key]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      judul: v.judul,
      deskripsi: v.deskripsi,
      tags: v.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      kategori: v.kategori,
      privacy: v.privacy,
      jadwal_tayang: v.jadwal_tayang
        ? new Date(v.jadwal_tayang).toISOString()
        : null,
      catatan: v.catatan,
      ck_final: v.ck_final,
      ck_resolusi: v.ck_resolusi,
      ck_audio: v.ck_audio,
      ck_copyright: v.ck_copyright,
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
            <label className="label" htmlFor="judul">
              Judul video *
            </label>
            <input
              id="judul"
              className="input"
              required
              maxLength={100}
              value={v.judul}
              onChange={(e) => set("judul", e.target.value)}
              placeholder="Judul yang akan tampil di YouTube"
            />
            <p className="mt-1 text-xs text-ink-400">
              {v.judul.length}/100 karakter
            </p>
          </div>

          <div>
            <label className="label" htmlFor="deskripsi">
              Deskripsi
            </label>
            <textarea
              id="deskripsi"
              className="input min-h-32 resize-y"
              value={v.deskripsi}
              onChange={(e) => set("deskripsi", e.target.value)}
              placeholder="Deskripsi lengkap, termasuk kredit dan tautan yang perlu dicantumkan"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="tags">
                Tag
              </label>
              <input
                id="tags"
                className="input"
                value={v.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="pisahkan, dengan, koma"
              />
            </div>
            <div>
              <label className="label" htmlFor="kategori">
                Kategori
              </label>
              <input
                id="kategori"
                className="input"
                value={v.kategori}
                onChange={(e) => set("kategori", e.target.value)}
                placeholder="mis. Dokumentasi kegiatan"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="privacy">
                Privasi
              </label>
              <select
                id="privacy"
                className="input"
                value={v.privacy}
                onChange={(e) => set("privacy", e.target.value as Privacy)}
              >
                {(Object.keys(PRIVACY_LABEL) as Privacy[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIVACY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="jadwal">
                Diharapkan tayang
              </label>
              <input
                id="jadwal"
                type="datetime-local"
                className="input"
                value={v.jadwal_tayang}
                onChange={(e) => set("jadwal_tayang", e.target.value)}
              />
            </div>
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

      <div className="card p-5">
        <h2 className="mb-1 text-sm font-semibold">Checklist sebelum kirim</h2>
        <p className="mb-4 text-xs text-ink-400">
          Empat hal ini yang paling sering bikin request balik lagi. Centang
          semua supaya tidak bolak-balik.
        </p>

        <div className="space-y-2.5">
          {CHECKS.map((c) => (
            <label
              key={c.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-800 bg-ink-850/40 p-3 text-sm transition hover:border-ink-700"
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-brand-500"
                checked={v[c.key]}
                onChange={(e) => set(c.key, e.target.checked)}
              />
              <span className="text-ink-300">{c.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={saving || !allChecked}>
          {saving
            ? "Menyimpan…"
            : existing
              ? "Simpan perubahan"
              : "Buat request & lanjut upload"}
        </button>
        {!allChecked && (
          <span className="text-xs text-ink-400">
            Centang semua checklist dulu
          </span>
        )}
      </div>
    </form>
  );
}
