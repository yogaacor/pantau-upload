import { ApiError, handle, logEvent, requireActor } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  return handle(async () => {
    const { id } = await ctx.params;
    const actor = await requireActor();
    const { pesan } = (await request.json()) as { pesan?: string };

    const message = pesan?.trim();
    if (!message) throw new ApiError(400, "Komentar kosong");

    // RLS memastikan hanya pemilik request atau admin yang boleh menulis.
    await logEvent(actor, { request_id: id, type: "komentar", message });

    return { ok: true };
  });
}
