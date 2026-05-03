import { cn } from "@/lib/utils";
import type { CandidateStatus } from "@/lib/types";

const STYLES: Record<CandidateStatus, string> = {
  pending: "border-border text-muted",
  calling: "border-warn text-warn animate-pulse",
  completed: "border-ok text-ok",
  failed: "border-bad text-bad",
  no_answer: "border-bad/60 text-bad/80",
};

const LABEL: Record<CandidateStatus, string> = {
  pending: "Pending",
  calling: "Calling…",
  completed: "Completed",
  failed: "Failed",
  no_answer: "No answer",
};

export function StatusPill({ status }: { status: CandidateStatus }) {
  return <span className={cn("pill", STYLES[status])}>{LABEL[status]}</span>;
}
