import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("candidates")
    .select(
      "id, name, phone, status, screening:screenings(years_experience, current_ctc_lakhs, expected_ctc_lakhs, notice_period_days, relocation, is_interested, call_outcome, rank_score)",
    )
    .eq("role_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? [])
    .map((c: any) => {
      const s = Array.isArray(c.screening) ? c.screening[0] : c.screening;
      return {
        name: c.name,
        phone: c.phone,
        status: c.status,
        rank_score: s?.rank_score ?? "",
        years_experience: s?.years_experience ?? "",
        current_ctc_lakhs: s?.current_ctc_lakhs ?? "",
        expected_ctc_lakhs: s?.expected_ctc_lakhs ?? "",
        notice_period_days: s?.notice_period_days ?? "",
        relocation: s?.relocation ?? "",
        is_interested: s?.is_interested ?? "",
        call_outcome: s?.call_outcome ?? "",
      };
    })
    .sort((a, b) => (Number(b.rank_score) || 0) - (Number(a.rank_score) || 0));

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="shortlist-${id}.csv"`,
    },
  });
}
