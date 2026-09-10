import { ApiError, handle, logEvent, requireAdmin } from "@/lib/api";
import { deleteFile } from "@/lib/google";
import type { RequestRow } from "@/lib/types";

type Body = { requestId?: string; includeThumb?: boolean };

/**
 * Hapus file mentah dari Drive setelah videonya tayang di YouTube.
 * Barisnya tetap ada — yang hilang cuma file besarnya, supaya kuota
 * Drive tidak habis. Sengaja admin-only dan hanya untuk status 'selesai'.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireAdmin();
    const body = (await request.json()) as Body;

    if (!body.requestId) throw new ApiError(400, "requestId wajib diisi");

    const { data } = await actor.supabase
      .from("requests")
      .select("*")
      .eq("id", body.requestId)
      .maybeSingle();

    if (!data) throw new ApiError(404, "Request tidak ditemukan");
    const row = data as RequestRow;

    if (row.status !== "selesai") {
      throw new ApiError(400, "File hanya boleh dihapus setelah status Selesai");
    }
    if (!row.drive_file_id) throw new ApiError(400, "Tidak ada file di Drive");

    await deleteFile(row.drive_file_id);
    if (body.includeThumb && row.thumb_file_id) {
      await deleteFile(row.thumb_file_id);
    }

    const patch: Record<string, unknown> = {
      drive_file_id: null,
      drive_deleted_at: new Date().toISOString(),
    };
    if (body.includeThumb && row.thumb_file_id) patch.thumb_file_id = null;

    const { error } = await actor.supabase
      .from("requests")
      .update(patch)
      .eq("id", row.id);
    if (error) throw new ApiError(400, error.message);

    await logEvent(actor, {
      request_id: row.id,
      type: "drive_hapus",
      message: `File dihapus dari Drive: ${row.drive_file_name ?? row.drive_file_id}`,
    });

    return { ok: true };
  });
}
