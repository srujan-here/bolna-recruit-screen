import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import RoleDashboard from "@/components/RoleDashboard";

export const dynamic = "force-dynamic";

export default async function RolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data: role } = await sb.from("roles").select("*").eq("id", id).single();
  if (!role) return notFound();

  const { data: candidates } = await sb
    .from("candidates")
    .select("*, screening:screenings(*)")
    .eq("role_id", id)
    .order("created_at", { ascending: true });

  const flat = (candidates ?? []).map((c: any) => ({
    ...c,
    screening: Array.isArray(c.screening) ? c.screening[0] ?? null : c.screening ?? null,
  }));

  return <RoleDashboard role={role} initialCandidates={flat} />;
}
