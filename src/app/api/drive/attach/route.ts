import { ApiError, handle, logEvent, requireActor } from "@/lib/api";
import { deleteFile, getFileMeta } from "@/lib/google";
import { formatBytes } from "@/lib/format";
import type { RequestRow } from "@/lib/types";

type Body = {
  requestId?: string;
  kind?: "video" | "thumb";
  fileId?: string;
};

/**
 * Dipanggil browser setelah PUT ke Drive selesai, untuk mencatat fileId
 * pada request. Metadata dibaca ulang dari Drive supaya ukuran & nama yang
 * tersimpan benar-benar sesuai isi Drive, bukan sekadar klaim dari klien.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireActor();
    const body = (await request.json()) as Body;

    const kind = body.kind ?? "video";
    if (!body.requestId) throw new ApiError(400, "requestId wajib diisi");
    if (!body.fileId) throw new ApiError(400, "fileId wajib diisi");

    const { data } = await actor.supabase
      .from("requests")
      .select("*")
      .eq("id", body.requestId)
      .maybeSingle();

    if (!data) throw new ApiError(404, "Request tidak ditemukan");
    const row = data as RequestRow;

    const isAdmin = actor.profile.role === "admin";
    if (!isAdmin && row.requester_id !== actor.profile.id) {
      throw new ApiError(403, "Bukan request kamu");
    }

    const meta = await getFileMeta(body.fileId);
    if (!meta) throw new ApiError(404, "File tidak ditemukan di Drive");

    const patch: Record<string, unknown> =
      kind === "thumb"
        ? { thumb_file_id: meta.id, thumb_file_name: meta.name }
        : {
            drive_file_id: meta.id,
            drive_file_name: meta.name,
            drive_file_size: meta.size,
            drive_mime: meta.mimeType,
            drive_deleted_at: null,
          };

    const { error } = await actor.supabase
      .from("requests")
      .update(patch)
      .eq("id", row.id);
    if (error) throw new ApiError(400, error.message);

    // Bersihkan file lama kalau ini penggantian.
    const previousId = kind === "thumb" ? row.thumb_file_id : row.drive_file_id;
    if (previousId && previousId !== meta.id) {
      try {
        await deleteFile(previousId);
      } catch (err) {
        console.error("Gagal menghapus file lama di Drive", err);
      }
    }

    await logEvent(actor, {
      request_id: row.id,
      type: "file",
      message:
        kind === "thumb"
          ? `Thumbnail diunggah: ${meta.name}`
          : `Berkas diunggah: ${meta.name} (${formatBytes(meta.size)})`,
    });

    return { ok: true, name: meta.name, size: meta.size };
  });
}
