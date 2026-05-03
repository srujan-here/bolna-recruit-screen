import type { CallOutcome, Relocation } from "./types";

const BASE = process.env.BOLNA_API_BASE || "https://api.bolna.ai";

export type TriggerCallInput = {
  agentId: string;
  contactNumber: string;
  dynamicData: {
    candidate_name: string;
    role_title: string;
    company_name: string;
    jd_summary: string;
    location: string;
  };
};

export type TriggerCallResponse = {
  execution_id: string;
  status?: string;
  message?: string;
};

export async function triggerCall(
  input: TriggerCallInput,
): Promise<TriggerCallResponse> {
  const apiKey = process.env.BOLNA_API_KEY;
  if (!apiKey) throw new Error("Missing BOLNA_API_KEY");

  const res = await fetch(`${BASE}/call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      agent_id: input.agentId,
      recipient_phone_number: input.contactNumber,
      recipient_data: input.dynamicData,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bolna /call failed (${res.status}): ${body}`);
  }
  return (await res.json()) as TriggerCallResponse;
}

// Bolna's webhook payload shape varies a bit; this is a defensive parser
// that normalizes the fields we care about. We keep the raw payload too.
export type ParsedWebhook = {
  executionId: string | null;
  callOutcome: CallOutcome | null;
  durationSeconds: number | null;
  transcript: unknown;
  extracted: {
    years_experience: number | null;
    current_ctc_lakhs: number | null;
    expected_ctc_lakhs: number | null;
    notice_period_days: number | null;
    relocation: Relocation | null;
    is_interested: boolean | null;
  };
};

function asNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.\-]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asBool(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    if (["yes", "true", "interested", "y"].includes(s)) return true;
    if (["no", "false", "not interested", "n"].includes(s)) return false;
  }
  return null;
}

function asRelocation(v: unknown): Relocation | null {
  if (typeof v !== "string") return null;
  const s = v.toLowerCase().trim();
  if (["yes", "y", "willing"].includes(s)) return "yes";
  if (["no", "n", "unwilling"].includes(s)) return "no";
  if (["negotiable", "maybe", "depends"].includes(s)) return "negotiable";
  return null;
}

function asOutcome(v: unknown): CallOutcome | null {
  if (typeof v !== "string") return null;
  const s = v.toLowerCase().trim().replace(/\s+/g, "_");
  if (
    ["completed", "not_interested", "callback_requested", "no_answer"].includes(
      s,
    )
  ) {
    return s as CallOutcome;
  }
  return null;
}

// Drill into Bolna's nested extraction structure. The docs show:
//   extracted_data: { Category: { "Field Name": { subjective, objective } } }
// We accept either a flat `{ field: value }` map or that nested form.
function pick(extracted: any, key: string): unknown {
  if (!extracted || typeof extracted !== "object") return null;
  if (key in extracted) {
    const v = extracted[key];
    if (v && typeof v === "object" && ("objective" in v || "subjective" in v)) {
      return v.objective ?? v.subjective;
    }
    return v;
  }
  // search nested categories
  for (const cat of Object.values(extracted)) {
    if (cat && typeof cat === "object" && key in (cat as object)) {
      const v = (cat as any)[key];
      if (v && typeof v === "object" && ("objective" in v || "subjective" in v)) {
        return v.objective ?? v.subjective;
      }
      return v;
    }
  }
  return null;
}

export function parseWebhook(body: any): ParsedWebhook {
  const extracted = body?.extracted_data ?? body?.extractions ?? {};
  return {
    executionId:
      body?.execution_id ??
      body?.executionId ??
      body?.id ??
      body?.data?.execution_id ??
      null,
    callOutcome:
      asOutcome(pick(extracted, "call_outcome")) ??
      asOutcome(body?.status) ??
      null,
    durationSeconds:
      asNumber(body?.duration) ??
      asNumber(body?.call_duration) ??
      asNumber(body?.duration_seconds) ??
      asNumber(body?.conversation_duration) ??
      asNumber(body?.telephony_data?.duration),
    transcript: body?.transcript ?? body?.messages ?? body?.conversation ?? null,
    extracted: {
      years_experience: asNumber(pick(extracted, "years_experience")),
      current_ctc_lakhs: asNumber(pick(extracted, "current_ctc_lakhs")),
      expected_ctc_lakhs: asNumber(pick(extracted, "expected_ctc_lakhs")),
      notice_period_days: asNumber(pick(extracted, "notice_period_days")),
      relocation: asRelocation(pick(extracted, "relocation")),
      is_interested: asBool(pick(extracted, "is_interested")),
    },
  };
}
