import { ApiError, handle, logEvent, requireActor } from "@/lib/api";
import { deleteFile } from "@/lib/google";
import type { RequestRow } from "@/lib/types";

type Body = { requestId?: string; kind?: "video" | "thumb" };

/**
 * Hapus berkas yang terlanjur salah unggah.
 *
 * Beda dengan /api/drive/delete yang membersihkan berkas mentah setelah
 * videonya tayang: yang ini untuk membatalkan unggahan, jadi boleh
 * dilakukan PIC pemiliknya selama request masih bisa diubah, dan tidak
 * menandai drive_deleted_at — requestnya kembali seperti belum ada berkas.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireActor();
    const body = (await request.json()) as Body;

    const kind = body.kind ?? "video";
    if (!body.requestId) throw new ApiError(400, "requestId wajib diisi");

    const { data } = await actor.supabase
      .from("requests")
      .select("*")
      .eq("id", body.requestId)
      .maybeSingle();

    if (!data) throw new ApiError(404, "Request tidak ditemukan");
    const row = data as RequestRow;

    const isAdmin = actor.profile.role === "admin";
    const isOwner = row.requester_id === actor.profile.id;

    if (!isAdmin && !isOwner) throw new ApiError(403, "Bukan request kamu");
    if (!isAdmin && row.status !== "baru" && row.status !== "revisi") {
      throw new ApiError(
        403,
        "Request sudah diproses admin, berkasnya tidak bisa dihapus sendiri",
      );
    }

    const fileId = kind === "thumb" ? row.thumb_file_id : row.drive_file_id;
    const fileName = kind === "thumb" ? row.thumb_file_name : row.drive_file_name;
    if (!fileId) throw new ApiError(400, "Tidak ada berkas untuk dihapus");

    await deleteFile(fileId);

    const patch: Record<string, unknown> =
      kind === "thumb"
        ? { thumb_file_id: null, thumb_file_name: null }
        : {
            drive_file_id: null,
            drive_file_name: null,
            drive_file_size: null,
            drive_mime: null,
          };

    const { error } = await actor.supabase
      .from("requests")
      .update(patch)
      .eq("id", row.id);
    if (error) throw new ApiError(400, error.message);

    await logEvent(actor, {
      request_id: row.id,
      type: "drive_hapus",
      message: `Berkas dibatalkan dan dihapus dari Drive: ${fileName ?? fileId}`,
    });

    return { ok: true };
  });
}
