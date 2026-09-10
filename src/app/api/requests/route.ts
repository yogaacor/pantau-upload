import { ApiError, handle, logEvent, requireActor } from "@/lib/api";
import type { Privacy } from "@/lib/types";

type Body = {
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
};

export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireActor();
    const body = (await request.json()) as Body;

    const judul = body.judul?.trim();
    if (!judul) throw new ApiError(400, "Judul wajib diisi");

    const { data, error } = await actor.supabase
      .from("requests")
      .insert({
        requester_id: actor.profile.id,
        judul,
        deskripsi: body.deskripsi?.trim() || null,
        tags: body.tags?.filter(Boolean) ?? [],
        kategori: body.kategori?.trim() || null,
        privacy: body.privacy ?? "public",
        jadwal_tayang: body.jadwal_tayang || null,
        catatan: body.catatan?.trim() || null,
        ck_final: !!body.ck_final,
        ck_resolusi: !!body.ck_resolusi,
        ck_copyright: !!body.ck_copyright,
        ck_audio: !!body.ck_audio,
      })
      .select("id, kode")
      .single();

    if (error) throw new ApiError(400, error.message);

    await logEvent(actor, {
      request_id: data.id,
      type: "dibuat",
      to_status: "baru",
      message: `Request dibuat: ${judul}`,
    });

    return { id: data.id as string, kode: data.kode as string | null };
  });
}
