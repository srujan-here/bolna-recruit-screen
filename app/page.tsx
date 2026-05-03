import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sb = supabaseAdmin();
  const { data: roles } = await sb
    .from("roles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Open roles</h1>
          <p className="text-muted text-sm mt-1">
            Upload candidates, let Aria screen them, review the shortlist.
          </p>
        </div>
        <Link href="/roles/new" className="btn-primary">
          + New role
        </Link>
      </div>

      {(!roles || roles.length === 0) && (
        <div className="card text-center text-muted">
          No roles yet. Create your first one to start screening.
        </div>
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles?.map((r) => (
          <li key={r.id}>
            <Link
              href={`/roles/${r.id}`}
              className="card block hover:border-brand transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-sm text-muted">{r.company_name}</div>
                </div>
                <div className="text-xs text-muted">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
              {r.location && (
                <div className="mt-3 text-xs text-muted">
                  📍 {r.location} · ≥{r.target_min_years}y · ≤₹{r.max_budget_lakhs}L
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
