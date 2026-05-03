"use client";

import { Fragment, useState } from "react";
import { StatusPill } from "./StatusPill";
import type { CandidateWithScreening } from "@/lib/types";

export default function CandidateTable({
  candidates,
  onTrigger,
}: {
  candidates: CandidateWithScreening[];
  onTrigger: (id: string) => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (candidates.length === 0) {
    return (
      <div className="card text-center text-muted">
        No candidates yet. Upload a CSV to get started.
      </div>
    );
  }

  // Sort: completed (by score desc) → calling → pending → others
  const ordered = [...candidates].sort((a, b) => {
    const order: Record<string, number> = {
      completed: 0,
      calling: 1,
      pending: 2,
      no_answer: 3,
      failed: 4,
    };
    const oa = order[a.status] ?? 9;
    const ob = order[b.status] ?? 9;
    if (oa !== ob) return oa - ob;
    const sa = a.screening?.rank_score ?? -1;
    const sb = b.screening?.rank_score ?? -1;
    return sb - sa;
  });

  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead className="bg-[#161a22] text-muted text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left px-4 py-3">Candidate</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-right px-4 py-3">Score</th>
            <th className="text-right px-4 py-3">Exp</th>
            <th className="text-right px-4 py-3">Expected CTC</th>
            <th className="text-right px-4 py-3">Notice</th>
            <th className="text-left px-4 py-3">Reloc</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((c) => {
            const s = c.screening;
            const open = openId === c.id;
            return (
              <Fragment key={c.id}>
                <tr className="border-t border-border hover:bg-[#0f1218]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted font-mono">{c.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {s?.rank_score != null ? (
                      <span
                        className={
                          s.rank_score >= 70
                            ? "text-ok font-semibold"
                            : s.rank_score >= 40
                              ? "text-warn"
                              : "text-bad"
                        }
                      >
                        {s.rank_score}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
                    {s?.years_experience != null ? `${s.years_experience}y` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
                    {s?.expected_ctc_lakhs != null ? `₹${s.expected_ctc_lakhs}L` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
                    {s?.notice_period_days != null ? `${s.notice_period_days}d` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{s?.relocation ?? "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {c.status === "pending" && (
                      <button onClick={() => onTrigger(c.id)} className="btn">
                        ☎ Call
                      </button>
                    )}
                    {s && (
                      <button
                        onClick={() => setOpenId(open ? null : c.id)}
                        className="btn ml-2"
                      >
                        {open ? "Hide" : "Details"}
                      </button>
                    )}
                  </td>
                </tr>
                {open && s && (
                  <tr className="bg-[#0d1015]">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted uppercase mb-2">
                            Extracted
                          </div>
                          <ul className="text-xs space-y-1 font-mono">
                            <li>interested: {String(s.is_interested ?? "—")}</li>
                            <li>current_ctc: ₹{s.current_ctc_lakhs ?? "—"}L</li>
                            <li>expected_ctc: ₹{s.expected_ctc_lakhs ?? "—"}L</li>
                            <li>notice: {s.notice_period_days ?? "—"}d</li>
                            <li>relocation: {s.relocation ?? "—"}</li>
                            <li>outcome: {s.call_outcome ?? "—"}</li>
                            <li>duration: {s.duration_seconds ?? "—"}s</li>
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs text-muted uppercase mb-2">
                            Transcript
                          </div>
                          <pre className="text-xs whitespace-pre-wrap max-h-48 overflow-auto rounded border border-border p-2 bg-[#0b0d10]">
                            {formatTranscript(s.transcript)}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatTranscript(t: unknown): string {
  if (!t) return "(no transcript)";
  if (typeof t === "string") return t;
  if (Array.isArray(t)) {
    return t
      .map((m: any) => {
        const role = m.role ?? m.speaker ?? "?";
        const text = m.content ?? m.text ?? m.message ?? "";
        return `${role}: ${text}`;
      })
      .join("\n");
  }
  return JSON.stringify(t, null, 2);
}
