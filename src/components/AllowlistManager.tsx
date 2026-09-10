"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/types";

export type AllowlistRow = {
  email: string;
  role: Role;
  divisi: string | null;
  terdaftar: boolean;
};

export function AllowlistManager({
  rows,
  selfEmail,
}: {
  rows: AllowlistRow[];
  selfEmail: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [divisi, setDivisi] = useState("");
  const [role, setRole] = useState<Role>("pic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function tambah(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/allowlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, divisi }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(json.error ?? "Gagal menambahkan");
      return;
    }
    setEmail("");
    setDivisi("");
    router.refresh();
  }

  async function hapus(target: string) {
    if (!window.confirm(`Cabut akses ${target}?`)) return;
    setError(null);

    const res = await fetch(`/api/allowlist?email=${encodeURIComponent(target)}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Gagal menghapus");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={tambah} className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Tambah anggota</h2>

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto]">
          <div>
            <label className="label" htmlFor="email">
              Email Google
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@gmail.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="divisi">
              Divisi
            </label>
            <input
              id="divisi"
              className="input"
              value={divisi}
              onChange={(e) => setDivisi(e.target.value)}
              placeholder="opsional"
            />
          </div>
          <div>
            <label className="label" htmlFor="role">
              Peran
            </label>
            <select
              id="role"
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="pic">PIC</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <button className="btn-primary mt-4" disabled={busy}>
          {busy ? "Menyimpan…" : "Tambahkan"}
        </button>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-800 text-left text-xs text-ink-400">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Divisi</th>
              <th className="px-4 py-3 font-medium">Peran</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800/70">
            {rows.map((r) => (
              <tr key={r.email}>
                <td className="px-4 py-3">{r.email}</td>
                <td className="px-4 py-3 text-ink-300">{r.divisi ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`badge ${
                      r.role === "admin"
                        ? "bg-brand-500/10 text-brand-400 ring-brand-500/30"
                        : "bg-ink-800 text-ink-300 ring-ink-700"
                    }`}
                  >
                    {r.role === "admin" ? "Admin" : "PIC"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink-400">
                  {r.terdaftar ? "sudah pernah login" : "belum login"}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.email.toLowerCase() !== selfEmail.toLowerCase() && (
                    <button
                      onClick={() => hapus(r.email)}
                      className="text-xs text-rose-400 underline-offset-2 hover:underline"
                    >
                      Cabut
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-400">
                  Belum ada anggota.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
