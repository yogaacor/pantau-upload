import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EventType, Profile, Status } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Actor = {
  supabase: SupabaseClient;
  profile: Profile;
};

/** Ambil user yang login beserta profilnya, atau lempar 401. */
export async function requireActor(): Promise<Actor> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new ApiError(401, "Belum login");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) throw new ApiError(403, "Akun belum terdaftar");

  return { supabase, profile: data as Profile };
}

export async function requireAdmin(): Promise<Actor> {
  const actor = await requireActor();
  if (actor.profile.role !== "admin") {
    throw new ApiError(403, "Khusus admin");
  }
  return actor;
}

/** Bungkus handler supaya ApiError jadi response JSON yang rapi. */
export async function handle<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json((await fn()) ?? { ok: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function logEvent(
  actor: Actor,
  entry: {
    request_id: string;
    type: EventType;
    from_status?: Status | null;
    to_status?: Status | null;
    message?: string | null;
  },
) {
  await actor.supabase.from("request_events").insert({
    request_id: entry.request_id,
    actor_id: actor.profile.id,
    actor_name: actor.profile.full_name ?? actor.profile.email,
    type: entry.type,
    from_status: entry.from_status ?? null,
    to_status: entry.to_status ?? null,
    message: entry.message ?? null,
  });
}
