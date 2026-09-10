import Link from "next/link";
import type { Profile } from "@/lib/types";

export function TopNav({ profile }: { profile: Profile }) {
  const isAdmin = profile.role === "admin";

  const links = isAdmin
    ? [
        { href: "/admin", label: "Antrian" },
        { href: "/dashboard", label: "Request saya" },
        { href: "/admin/anggota", label: "Anggota" },
      ]
    : [
        { href: "/dashboard", label: "Request saya" },
        { href: "/dashboard/baru", label: "Buat request" },
      ];

  return (
    <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-brand-600 text-[13px] text-white">
            ▶
          </span>
          pantau<span className="-ml-2 text-ink-400">-upload</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2.5 py-1.5 text-ink-300 transition hover:bg-ink-850 hover:text-ink-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm">{profile.full_name ?? profile.email}</div>
            <div className="text-xs text-ink-400">
              {isAdmin ? "Admin" : (profile.divisi ?? "PIC")}
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button className="btn-ghost px-2.5 py-1.5 text-xs" type="submit">
              Keluar
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
