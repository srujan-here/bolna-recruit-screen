import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { role_id, candidates } = body as {
    role_id: string;
    candidates: { name: string; phone: string }[];
  };
  if (!role_id || !Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json(
      { error: "role_id and non-empty candidates array required" },
      { status: 400 },
    );
  }
  const sb = supabaseAdmin();
  const rows = candidates.map((c) => ({
    role_id,
    name: c.name,
    phone: c.phone,
    status: "pending" as const,
  }));
  const { data, error } = await sb.from("candidates").insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: data?.length ?? 0, candidates: data });
}
