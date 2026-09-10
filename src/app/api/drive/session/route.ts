import { ApiError, handle, requireActor } from "@/lib/api";
import { buildFileName, createResumableSession } from "@/lib/google";
import type { RequestRow } from "@/lib/types";

/** Batas aman per file; bisa ditimpa lewat env. Default 5 GB. */
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 ** 3);

type Body = {
  requestId?: string;
  kind?: "video" | "thumb";
  fileName?: string;
  mimeType?: string;
  size?: number;
};

export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireActor();
    const body = (await request.json()) as Body;

    const kind = body.kind ?? "video";
    if (!body.requestId) throw new ApiError(400, "requestId wajib diisi");
    if (!body.fileName) throw new ApiError(400, "Nama file kosong");
    if (!body.size || body.size <= 0) throw new ApiError(400, "Ukuran file tidak valid");
    if (body.size > MAX_BYTES) {
      throw new ApiError(
        413,
        `File terlalu besar. Maksimal ${(MAX_BYTES / 1024 ** 3).toFixed(1)} GB`,
      );
    }

    const mimeType = body.mimeType || "application/octet-stream";
    if (kind === "video" && !mimeType.startsWith("video/")) {
      throw new ApiError(400, "File harus berupa video");
    }
    if (kind === "thumb" && !mimeType.startsWith("image/")) {
      throw new ApiError(400, "Thumbnail harus berupa gambar");
    }

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
      throw new ApiError(403, "Request sudah dikunci, file tidak bisa diganti");
    }

    const name = buildFileName({
      kode: kind === "thumb" ? `${row.kode ?? ""}-thumb` : row.kode,
      divisi: actor.profile.divisi,
      judul: row.judul,
      originalName: body.fileName,
    });

    // Origin diteruskan supaya Google mengirim header CORS untuk PUT dari browser.
    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const uploadUrl = await createResumableSession({
      name,
      mimeType,
      size: body.size,
      origin,
    });

    return { uploadUrl, name };
  });
}
