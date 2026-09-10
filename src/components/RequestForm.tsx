"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Jenis, RequestRow } from "@/lib/types";

type Values = {
  jenis: Jenis;
  judul: string;
  catatan: string;
};

const PILIHAN_JENIS: {
  jenis: Jenis;
  judul: string;
  isi: string;
}[] = [
  {
    jenis: "video",
    judul: "Video sudah jadi",
    isi: "Berkas video final, tinggal diunggah apa adanya.",
  },
  {
    jenis: "zoom",
    judul: "Rekaman Zoom mentah",
    isi: "Belum dikonversi karena penyimpanan penuh. Kirim folder rekamannya dalam satu .zip — admin yang mengonversi.",
  },
];

export function RequestForm({ existing }: { existing?: RequestRow }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [v, setV] = useState<Values>({
    jenis: existing?.jenis ?? "video",
    judul: existing?.judul ?? "",
    catatan: existing?.catatan ?? "",
  });

  // Jenis dikunci setelah berkasnya masuk, karena berkas yang sudah
  // terunggah belum tentu cocok dengan jenis yang baru.
  const jenisTerkunci = !!existing?.drive_file_id;

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      jenis: v.jenis,
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
        <h2 className="mb-1 text-sm font-semibold">Jenis kiriman</h2>
        <p className="mb-4 text-xs text-ink-400">
          {jenisTerkunci
            ? "Tidak bisa diubah karena berkasnya sudah diunggah. Ganti berkasnya dulu kalau memang perlu."
            : "Pilih sesuai kondisi berkas yang kamu punya."}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {PILIHAN_JENIS.map((p) => {
            const aktif = v.jenis === p.jenis;
            return (
              <label
                key={p.jenis}
                className={`rounded-lg border p-3.5 transition ${
                  aktif
                    ? "border-brand-500/60 bg-brand-500/5"
                    : "border-ink-800 bg-ink-850/40 hover:border-ink-700"
                } ${jenisTerkunci ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="jenis"
                    className="mt-0.5 size-4 accent-brand-500"
                    checked={aktif}
                    disabled={jenisTerkunci}
                    onChange={() => set("jenis", p.jenis)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{p.judul}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-400">
                      {p.isi}
                    </span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">
          {v.jenis === "zoom" ? "Detail rekaman" : "Detail video"}
        </h2>

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
