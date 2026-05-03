import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { triggerCall } from "@/lib/bolna";

export async function POST(req: NextRequest) {
  const { candidate_id } = await req.json();
  if (!candidate_id) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }
  const agentId = process.env.BOLNA_AGENT_ID;
  if (!agentId) {
    return NextResponse.json({ error: "BOLNA_AGENT_ID not set" }, { status: 500 });
  }

  const sb = supabaseAdmin();
  const { data: candidate, error: cErr } = await sb
    .from("candidates")
    .select("*, role:roles(*)")
    .eq("id", candidate_id)
    .single();
  if (cErr || !candidate) {
    return NextResponse.json({ error: cErr?.message ?? "candidate not found" }, { status: 404 });
  }

  const role = (candidate as any).role;
  try {
    const resp = await triggerCall({
      agentId,
      contactNumber: candidate.phone,
      dynamicData: {
        candidate_name: candidate.name,
        role_title: role.title,
        company_name: role.company_name,
        jd_summary: role.jd_summary ?? "",
        location: role.location ?? "",
      },
    });
    await sb
      .from("candidates")
      .update({ status: "calling", bolna_execution_id: resp.execution_id })
      .eq("id", candidate.id);
    return NextResponse.json({ ok: true, execution_id: resp.execution_id });
  } catch (e: any) {
    await sb.from("candidates").update({ status: "failed" }).eq("id", candidate.id);
    return NextResponse.json({ error: e.message ?? "trigger failed" }, { status: 502 });
  }
}
