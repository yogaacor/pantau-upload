import { ApiError, handle, requireAdmin } from "@/lib/api";
import type { Role } from "@/lib/types";

type Body = { id?: string; role?: Role; blocked?: boolean };

/**
 * Ubah peran atau status blokir seorang anggota. Admin-only, dan admin
 * tidak bisa menurunkan atau memblokir dirinya sendiri — supaya tidak ada
 * cara mengunci diri keluar dari satu-satunya akun admin.
 */
export async function PATCH(request: Request) {
  return handle(async () => {
    const actor = await requireAdmin();
    const body = (await request.json()) as Body;

    if (!body.id) throw new ApiError(400, "id wajib diisi");
    if (body.id === actor.profile.id) {
      throw new ApiError(400, "Tidak bisa mengubah akunmu sendiri");
    }

    const patch: Record<string, unknown> = {};
    if (body.role !== undefined) {
      if (body.role !== "pic" && body.role !== "admin") {
        throw new ApiError(400, "Peran tidak dikenali");
      }
      patch.role = body.role;
    }
    if (body.blocked !== undefined) patch.blocked = body.blocked;

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await actor.supabase
      .from("profiles")
      .update(patch)
      .eq("id", body.id);

    if (error) throw new ApiError(400, error.message);
    return { ok: true };
  });
}
