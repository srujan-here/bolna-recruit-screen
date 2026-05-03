export type CandidateStatus =
  | "pending"
  | "calling"
  | "completed"
  | "failed"
  | "no_answer";

export type Relocation = "yes" | "no" | "negotiable";

export type CallOutcome =
  | "completed"
  | "not_interested"
  | "callback_requested"
  | "no_answer";

export type Role = {
  id: string;
  title: string;
  company_name: string;
  jd_summary: string | null;
  location: string | null;
  target_min_years: number | null;
  max_budget_lakhs: number | null;
  created_at: string;
};

export type Candidate = {
  id: string;
  role_id: string;
  name: string;
  phone: string;
  status: CandidateStatus;
  bolna_execution_id: string | null;
  created_at: string;
};

export type Screening = {
  id: string;
  candidate_id: string;
  years_experience: number | null;
  current_ctc_lakhs: number | null;
  expected_ctc_lakhs: number | null;
  notice_period_days: number | null;
  relocation: Relocation | null;
  is_interested: boolean | null;
  call_outcome: CallOutcome | null;
  transcript: unknown;
  duration_seconds: number | null;
  rank_score: number | null;
  raw_payload: unknown;
  created_at: string;
};

export type CandidateWithScreening = Candidate & {
  screening: Screening | null;
};
