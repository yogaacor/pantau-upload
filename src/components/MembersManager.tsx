"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import type { Profile, Role } from "@/lib/types";

export function MembersManager({
  members,
  selfId,
}: {
  members: Profile[];
  selfId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ubah(id: string, patch: { role?: Role; blocked?: boolean }) {
    setBusy(id);
    setError(null);

    const res = await fetch("/api/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);

    if (!res.ok) {
      setError(json.error ?? "Gagal menyimpan");
      return;
    }
    router.refresh();
  }

  async function blokir(m: Profile) {
    const pesan = m.blocked
      ? `Buka blokir ${m.email}? Dia bisa membuat request lagi.`
      : `Blokir ${m.email}? Dia masih bisa login tapi tidak bisa membuat atau mengubah apa pun.`;
    if (!window.confirm(pesan)) return;
    await ubah(m.id, { blocked: !m.blocked });
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-800 text-left text-xs text-ink-400">
              <tr>
                <th className="px-4 py-3 font-medium">Anggota</th>
                <th className="px-4 py-3 font-medium">Divisi</th>
                <th className="px-4 py-3 font-medium">Peran</th>
                <th className="px-4 py-3 font-medium">Gabung</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800/70">
              {members.map((m) => {
                const self = m.id === selfId;
                return (
                  <tr
                    key={m.id}
                    className={m.blocked ? "opacity-55" : undefined}
                  >
                    <td className="px-4 py-3">
                      <span className="block">
                        {m.full_name ?? m.email}
                        {self && (
                          <span className="ml-2 text-xs text-ink-400">
                            (kamu)
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-ink-400">
                        {m.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-300">
                      {m.divisi ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="input w-28 py-1 text-xs"
                        value={m.role}
                        disabled={self || busy !== null}
                        onChange={(e) =>
                          ubah(m.id, { role: e.target.value as Role })
                        }
                      >
                        <option value="pic">PIC</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-400">
                      {formatDate(m.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.blocked && (
                        <span className="badge mr-3 bg-rose-500/10 text-rose-300 ring-rose-500/30">
                          Diblokir
                        </span>
                      )}
                      {!self && (
                        <button
                          onClick={() => blokir(m)}
                          disabled={busy !== null}
                          className={`text-xs underline-offset-2 hover:underline ${
                            m.blocked ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {busy === m.id
                            ? "…"
                            : m.blocked
                              ? "Buka blokir"
                              : "Blokir"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-400">
                    Belum ada yang pernah login.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
