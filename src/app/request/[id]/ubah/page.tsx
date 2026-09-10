import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { RequestForm } from "@/components/RequestForm";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import type { RequestRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UbahRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const row = data as RequestRow;

  const boleh =
    profile.role === "admin" ||
    (row.requester_id === profile.id &&
      (row.status === "baru" || row.status === "revisi"));

  if (!boleh) redirect(`/request/${id}`);

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href={`/request/${id}`}
          className="text-sm text-ink-400 transition hover:text-ink-100"
        >
          ← Kembali ke request
        </Link>

        <h1 className="mt-3 mb-7 text-2xl font-semibold tracking-tight">
          Ubah {row.kode}
        </h1>

        <RequestForm existing={row} />
      </main>
    </>
  );
}
