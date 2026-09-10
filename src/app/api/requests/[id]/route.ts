import { ApiError, handle, logEvent, requireActor } from "@/lib/api";
import { parseYouTubeId, youtubeWatchUrl } from "@/lib/format";
import { STATUS_LABEL, type Privacy, type RequestRow, type Status } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

type Body = {
  // metadata (PIC, selama status baru/revisi)
  judul?: string;
  deskripsi?: string;
  tags?: string[];
  kategori?: string;
  privacy?: Privacy;
  jadwal_tayang?: string | null;
  catatan?: string;
  ck_final?: boolean;
  ck_resolusi?: boolean;
  ck_copyright?: boolean;
  ck_audio?: boolean;
  // admin
  status?: Status;
  youtube_url?: string | null;
  pesan?: string;
};

export async function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    const { id } = await ctx.params;
    const actor = await requireActor();
    const body = (await request.json()) as Body;
    const isAdmin = actor.profile.role === "admin";

    const { data: current } = await actor.supabase
      .from("requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!current) throw new ApiError(404, "Request tidak ditemukan");
    const row = current as RequestRow;

    const patch: Record<string, unknown> = {};

    // --- metadata -----------------------------------------------------
    const editableByPic =
      row.requester_id === actor.profile.id &&
      (row.status === "baru" || row.status === "revisi");

    if (
      body.judul !== undefined ||
      body.deskripsi !== undefined ||
      body.tags !== undefined ||
      body.kategori !== undefined ||
      body.privacy !== undefined ||
      body.jadwal_tayang !== undefined ||
      body.catatan !== undefined ||
      body.ck_final !== undefined ||
      body.ck_resolusi !== undefined ||
      body.ck_copyright !== undefined ||
      body.ck_audio !== undefined
    ) {
      if (!isAdmin && !editableByPic) {
        throw new ApiError(403, "Request ini sudah dikunci, tidak bisa diubah");
      }
      if (body.judul !== undefined) {
        const judul = body.judul.trim();
        if (!judul) throw new ApiError(400, "Judul wajib diisi");
        patch.judul = judul;
      }
      if (body.deskripsi !== undefined) patch.deskripsi = body.deskripsi?.trim() || null;
      if (body.tags !== undefined) patch.tags = body.tags?.filter(Boolean) ?? [];
      if (body.kategori !== undefined) patch.kategori = body.kategori?.trim() || null;
      if (body.privacy !== undefined) patch.privacy = body.privacy;
      if (body.jadwal_tayang !== undefined) patch.jadwal_tayang = body.jadwal_tayang || null;
      if (body.catatan !== undefined) patch.catatan = body.catatan?.trim() || null;
      if (body.ck_final !== undefined) patch.ck_final = body.ck_final;
      if (body.ck_resolusi !== undefined) patch.ck_resolusi = body.ck_resolusi;
      if (body.ck_copyright !== undefined) patch.ck_copyright = body.ck_copyright;
      if (body.ck_audio !== undefined) patch.ck_audio = body.ck_audio;
    }

    // --- link YouTube -------------------------------------------------
    let youtubeChanged = false;
    if (body.youtube_url !== undefined) {
      if (!isAdmin) throw new ApiError(403, "Khusus admin");

      if (!body.youtube_url) {
        patch.youtube_url = null;
        patch.youtube_video_id = null;
        patch.published_at = null;
      } else {
        const videoId = parseYouTubeId(body.youtube_url);
        if (!videoId) throw new ApiError(400, "Link YouTube tidak dikenali");
        patch.youtube_url = youtubeWatchUrl(videoId);
        patch.youtube_video_id = videoId;
        patch.published_at = row.published_at ?? new Date().toISOString();
        youtubeChanged = videoId !== row.youtube_video_id;
      }
    }

    // --- status -------------------------------------------------------
    let statusChanged = false;
    if (body.status !== undefined && body.status !== row.status) {
      if (!isAdmin) throw new ApiError(403, "Khusus admin");

      if (body.status === "selesai") {
        const finalId = (patch.youtube_video_id as string | undefined) ?? row.youtube_video_id;
        if (!finalId) {
          throw new ApiError(400, "Isi link YouTube dulu sebelum menandai selesai");
        }
      }
      patch.status = body.status;
      statusChanged = true;
    }

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await actor.supabase.from("requests").update(patch).eq("id", id);
    if (error) throw new ApiError(400, error.message);

    if (youtubeChanged) {
      await logEvent(actor, {
        request_id: id,
        type: "youtube",
        message: `Link YouTube dipasang: ${patch.youtube_url}`,
      });
    }

    if (statusChanged) {
      const to = patch.status as Status;
      await logEvent(actor, {
        request_id: id,
        type: "status",
        from_status: row.status,
        to_status: to,
        message:
          body.pesan?.trim() ||
          `Status diubah ${STATUS_LABEL[row.status]} → ${STATUS_LABEL[to]}`,
      });
    }

    return { ok: true };
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  return handle(async () => {
    const { id } = await ctx.params;
    const actor = await requireActor();

    const { error } = await actor.supabase.from("requests").delete().eq("id", id);
    if (error) throw new ApiError(400, error.message);

    return { ok: true };
  });
}
