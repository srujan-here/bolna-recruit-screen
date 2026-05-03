import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, company_name, jd_summary, location, target_min_years, max_budget_lakhs } = body;
  if (!title || !company_name) {
    return NextResponse.json(
      { error: "title and company_name are required" },
      { status: 400 },
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("roles")
    .insert({
      title,
      company_name,
      jd_summary: jd_summary ?? null,
      location: location ?? null,
      target_min_years: target_min_years ?? 3,
      max_budget_lakhs: max_budget_lakhs ?? 30,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("roles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
