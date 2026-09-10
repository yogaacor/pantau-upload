import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/server";

export default async function Home() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  redirect(profile.role === "admin" ? "/admin" : "/dashboard");
}
