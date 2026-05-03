import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { triggerCall } from "@/lib/bolna";

export async function POST(req: NextRequest) {
  const { role_id } = await req.json();
  if (!role_id) {
    return NextResponse.json({ error: "role_id required" }, { status: 400 });
  }
  const agentId = process.env.BOLNA_AGENT_ID;
  if (!agentId) {
    return NextResponse.json({ error: "BOLNA_AGENT_ID not set" }, { status: 500 });
  }

  const sb = supabaseAdmin();
  const { data: role, error: rErr } = await sb
    .from("roles")
    .select("*")
    .eq("id", role_id)
    .single();
  if (rErr || !role) {
    return NextResponse.json({ error: rErr?.message ?? "role not found" }, { status: 404 });
  }

  const { data: pending, error: pErr } = await sb
    .from("candidates")
    .select("*")
    .eq("role_id", role_id)
    .eq("status", "pending");
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, triggered: 0, message: "no pending candidates" });
  }

  const results: { candidate_id: string; ok: boolean; error?: string }[] = [];
  // Sequential with a small delay to stay under Bolna's rate limit (500/min on /call).
  for (const c of pending) {
    try {
      const resp = await triggerCall({
        agentId,
        contactNumber: c.phone,
        dynamicData: {
          candidate_name: c.name,
          role_title: role.title,
          company_name: role.company_name,
          jd_summary: role.jd_summary ?? "",
          location: role.location ?? "",
        },
      });
      await sb
        .from("candidates")
        .update({ status: "calling", bolna_execution_id: resp.execution_id })
        .eq("id", c.id);
      results.push({ candidate_id: c.id, ok: true });
    } catch (e: any) {
      await sb.from("candidates").update({ status: "failed" }).eq("id", c.id);
      results.push({ candidate_id: c.id, ok: false, error: e.message });
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({
    ok: true,
    triggered: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
