import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { parseWebhook } from "@/lib/bolna";
import { rankScore } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params;
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseWebhook(body);

  if (!parsed.executionId) {
    return NextResponse.json(
      { error: "execution_id missing in payload" },
      { status: 400 },
    );
  }

  const sb = supabaseAdmin();

  const { data: candidate } = await sb
    .from("candidates")
    .select("*, role:roles(*)")
    .eq("bolna_execution_id", parsed.executionId)
    .maybeSingle();

  if (!candidate) {
    // No matching candidate — store nothing but ACK so Bolna stops retrying.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const role = (candidate as any).role;
  const breakdown = rankScore({
    years_experience: parsed.extracted.years_experience,
    expected_ctc_lakhs: parsed.extracted.expected_ctc_lakhs,
    notice_period_days: parsed.extracted.notice_period_days,
    relocation: parsed.extracted.relocation,
    is_interested: parsed.extracted.is_interested,
    target_min_years: role?.target_min_years ?? 3,
    max_budget_lakhs: role?.max_budget_lakhs ?? 30,
  });

  await sb.from("screenings").upsert(
    {
      candidate_id: candidate.id,
      years_experience: parsed.extracted.years_experience,
      current_ctc_lakhs: parsed.extracted.current_ctc_lakhs,
      expected_ctc_lakhs: parsed.extracted.expected_ctc_lakhs,
      notice_period_days: parsed.extracted.notice_period_days,
      relocation: parsed.extracted.relocation,
      is_interested: parsed.extracted.is_interested,
      call_outcome: parsed.callOutcome,
      transcript: parsed.transcript,
      duration_seconds: parsed.durationSeconds,
      rank_score: breakdown.total,
      raw_payload: body,
    },
    { onConflict: "candidate_id" },
  );

  const newStatus =
    parsed.callOutcome === "no_answer"
      ? "no_answer"
      : parsed.callOutcome === "not_interested"
        ? "completed"
        : "completed";

  await sb.from("candidates").update({ status: newStatus }).eq("id", candidate.id);

  return NextResponse.json({ ok: true, score: breakdown.total });
}
