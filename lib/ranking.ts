import type { Relocation } from "./types";

export type RankInputs = {
  years_experience: number | null;
  expected_ctc_lakhs: number | null;
  notice_period_days: number | null;
  relocation: Relocation | null;
  is_interested: boolean | null;
  target_min_years: number;
  max_budget_lakhs: number;
};

export type RankBreakdown = {
  total: number;
  interest: number;
  experience: number;
  ctc: number;
  notice: number;
  relocation: number;
};

export function rankScore(i: RankInputs): RankBreakdown {
  // Interest: hard signal. If they said no, the call is mostly worthless for ranking.
  const interest = i.is_interested === false ? 0 : i.is_interested ? 30 : 10;

  // Experience: 25 if at-or-above target, scaled below.
  const yrs = i.years_experience ?? 0;
  const target = Math.max(1, i.target_min_years);
  const experience = Math.round(25 * Math.min(yrs / target, 1));

  // CTC: 20 if within budget, falls to 0 at 1.5x budget.
  let ctc = 0;
  const exp = i.expected_ctc_lakhs;
  if (exp != null && i.max_budget_lakhs > 0) {
    if (exp <= i.max_budget_lakhs) ctc = 20;
    else {
      const overrun = (exp - i.max_budget_lakhs) / (0.5 * i.max_budget_lakhs);
      ctc = Math.max(0, Math.round(20 * (1 - overrun)));
    }
  }

  // Notice period: 15 if 0 days, 0 at 60+ days.
  const np = i.notice_period_days;
  const notice =
    np == null ? 0 : Math.max(0, Math.round(15 * (1 - Math.min(np, 60) / 60)));

  // Relocation: 10/5/0
  const reloc =
    i.relocation === "yes" ? 10 : i.relocation === "negotiable" ? 5 : 0;

  const total = interest + experience + ctc + notice + reloc;
  return {
    total: Math.max(0, Math.min(100, total)),
    interest,
    experience,
    ctc,
    notice,
    relocation: reloc,
  };
}
