"use client";

import { useEffect, useMemo, useState } from "react";
import UploadDropzone from "./UploadDropzone";
import CandidateTable from "./CandidateTable";
import { supabaseBrowser } from "@/lib/supabase/client";
import type {
  Candidate,
  CandidateWithScreening,
  Role,
  Screening,
} from "@/lib/types";

export default function RoleDashboard({
  role,
  initialCandidates,
}: {
  role: Role;
  initialCandidates: CandidateWithScreening[];
}) {
  const [candidates, setCandidates] = useState<CandidateWithScreening[]>(initialCandidates);
  const [batchBusy, setBatchBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Realtime subscriptions: candidates + screenings for this role.
  useEffect(() => {
    const sb = supabaseBrowser();

    const ch = sb
      .channel(`role-${role.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates", filter: `role_id=eq.${role.id}` },
        (payload) => {
          setCandidates((prev) => {
            if (payload.eventType === "INSERT") {
              const c = payload.new as Candidate;
              if (prev.some((x) => x.id === c.id)) return prev;
              return [...prev, { ...c, screening: null }];
            }
            if (payload.eventType === "UPDATE") {
              const c = payload.new as Candidate;
              return prev.map((x) => (x.id === c.id ? { ...x, ...c } : x));
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((x) => x.id !== (payload.old as Candidate).id);
            }
            return prev;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "screenings" },
        (payload) => {
          const s =
            payload.eventType === "DELETE"
              ? (payload.old as Screening)
              : (payload.new as Screening);
          setCandidates((prev) =>
            prev.map((x) =>
              x.id === s.candidate_id
                ? { ...x, screening: payload.eventType === "DELETE" ? null : s }
                : x,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, [role.id]);

  async function refresh() {
    // Realtime covers the steady state; this is a fallback right after CSV upload
    // so the user sees rows immediately even if a realtime event is delayed.
    const sb = supabaseBrowser();
    const { data } = await sb
      .from("candidates")
      .select("*, screening:screenings(*)")
      .eq("role_id", role.id)
      .order("created_at", { ascending: true });
    if (data) {
      setCandidates(
        (data as any[]).map((c) => ({
          ...c,
          screening: Array.isArray(c.screening) ? c.screening[0] ?? null : c.screening ?? null,
        })),
      );
    }
  }

  async function triggerOne(candidateId: string) {
    const res = await fetch("/api/calls/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_id: candidateId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setToast(`Call failed: ${j.error ?? "unknown"}`);
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function triggerBatch() {
    setBatchBusy(true);
    const res = await fetch("/api/calls/trigger-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id: role.id }),
    });
    setBatchBusy(false);
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setToast(`Triggered ${j.triggered ?? 0} call(s)`);
    } else {
      setToast(`Batch failed: ${j.error ?? "unknown"}`);
    }
    setTimeout(() => setToast(null), 4000);
  }

  const stats = useMemo(() => {
    const total = candidates.length;
    const completed = candidates.filter((c) => c.status === "completed").length;
    const calling = candidates.filter((c) => c.status === "calling").length;
    const qualified = candidates.filter(
      (c) => (c.screening?.rank_score ?? 0) >= 70,
    ).length;
    return { total, completed, calling, qualified };
  }, [candidates]);

  const pendingCount = candidates.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <a href="/" className="text-xs text-muted hover:text-text">
            ← All roles
          </a>
          <h1 className="text-2xl font-semibold mt-1">{role.title}</h1>
          <div className="text-sm text-muted">
            {role.company_name}
            {role.location ? ` · ${role.location}` : ""} · ≥{role.target_min_years}y · ≤₹
            {role.max_budget_lakhs}L
          </div>
          {role.jd_summary && (
            <p className="text-sm text-muted mt-2 max-w-2xl">{role.jd_summary}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={triggerBatch}
            disabled={batchBusy || pendingCount === 0}
            className="btn-primary"
            title={pendingCount === 0 ? "No pending candidates" : ""}
          >
            {batchBusy ? "Starting…" : `▶ Screen ${pendingCount} pending`}
          </button>
          <a href={`/api/roles/${role.id}/export`} className="btn">
            ⬇ Export shortlist
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total" value={stats.total} />
        <Stat label="Calling" value={stats.calling} accent="warn" />
        <Stat label="Completed" value={stats.completed} />
        <Stat label="Qualified (≥70)" value={stats.qualified} accent="ok" />
      </div>

      <UploadDropzone roleId={role.id} onUploaded={refresh} />

      <CandidateTable candidates={candidates} onTrigger={triggerOne} />

      {toast && (
        <div className="fixed bottom-6 right-6 card text-sm shadow-xl">{toast}</div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "ok" | "warn" | "bad";
}) {
  const color =
    accent === "ok"
      ? "text-ok"
      : accent === "warn"
        ? "text-warn"
        : accent === "bad"
          ? "text-bad"
          : "text-text";
  return (
    <div className="card">
      <div className="text-xs text-muted uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
