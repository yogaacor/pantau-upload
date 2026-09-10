import { ApiError, handle, requireAdmin } from "@/lib/api";
import type { Role } from "@/lib/types";

type Body = { email?: string; role?: Role; divisi?: string };

export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireAdmin();
    const body = (await request.json()) as Body;

    const email = body.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Email tidak valid");
    }

    const { error } = await actor.supabase.from("allowlist").upsert(
      {
        email,
        role: body.role === "admin" ? "admin" : "pic",
        divisi: body.divisi?.trim() || null,
      },
      { onConflict: "email" },
    );

    if (error) throw new ApiError(400, error.message);
    return { ok: true };
  });
}

export async function DELETE(request: Request) {
  return handle(async () => {
    const actor = await requireAdmin();
    const email = new URL(request.url).searchParams.get("email");
    if (!email) throw new ApiError(400, "Email wajib diisi");

    if (email.toLowerCase() === actor.profile.email.toLowerCase()) {
      throw new ApiError(400, "Tidak bisa menghapus akunmu sendiri");
    }

    const { error } = await actor.supabase
      .from("allowlist")
      .delete()
      .eq("email", email.toLowerCase());

    if (error) throw new ApiError(400, error.message);
    return { ok: true };
  });
}
