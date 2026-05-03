# Bolna Recruit Screen

Voice AI candidate pre-screening for high-volume hiring, built on [Bolna](https://www.bolna.ai).
Recruiters upload a candidate CSV, Aria (the Bolna agent) calls each one and runs a structured screen, the dashboard ranks them in realtime, and the recruiter exports a shortlist.

> Submission for the Bolna Full Stack Engineer take-home.

## Try it

- 🌐 **Live app:** https://bolna-recruit-screen.vercel.app
- 🎬 **Demo video:** _link added on submission_
- 🎙️ **Sample call recording (MP3):** [score-88 screen, 85s](https://bolna-recordings-india.s3.ap-south-1.amazonaws.com/plivo/28ef144c-4824-4581-a420-36e97850f840.mp3) — Aria calling "Srujan" for the Senior Backend Engineer role at Acme Labs

End-to-end verified with multiple real calls. Latest: 7 fields extracted, **rank score 88**, dashboard updated within ~2s of webhook delivery.

## Why this use case

Recruiters lose ~12 minutes per candidate on the same intro screen — confirming experience, current/expected CTC, notice period, relocation. For 100 candidates per role, that's 20 hours of repetitive work where the structured outputs (not the conversation) are what actually matters downstream. Bolna explicitly markets "streamline hiring" as a flagship use case, so this hits a workflow Bolna's own customers buy.

**Outcome metric:** qualified candidates surfaced per 100 calls + recruiter hours saved per role.

## Architecture

```
Recruiter
    │ uploads CSV
    ▼
Next.js (Vercel)  ──────►  Bolna POST /call  (user_data: {candidate_name, role_title, ...})
    ▲                            │
    │ Realtime                    ▼
    │ + 2s polling          Aria runs screening conversation (variables substituted)
Supabase Postgres                  │
    ▲                              ▼
    └──── webhook ───── /api/webhooks/bolna/<secret>
       upsert ranked screening    (terminal events only: completed/failed/missed/no_answer)
```

- **Frontend / API**: Next.js 15 (App Router, TypeScript) on Vercel
- **DB + realtime**: Supabase Postgres with Realtime enabled on `candidates` + `screenings`
- **Voice**: Bolna agent "Aria" with structured prompts + LLM extractions
- **Ranking**: transparent 0–100 score (interest 30 + experience 25 + CTC 20 + notice 15 + relocation 10)

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. SQL editor → paste `supabase/schema.sql` → run.
3. Copy `Project URL`, `anon` key, and `service_role` key from Project Settings → API.

### 2. Bolna agent

1. Create an agent in the [Bolna playground](https://platform.bolna.ai/).
2. Paste the four sections from `bolna/agent-prompt.md` into Personality / Context / Instructions / Guardrails.
3. Configure extractions per the table in that file.
4. Set the webhook URL in the Agent tab to:
   ```
   https://<your-app>/api/webhooks/bolna/<WEBHOOK_SECRET>
   ```
   Pick `execution_complete` as the event.
5. Generate an API key (Dashboard → Developers) and note your `agent_id`.

### 3. Local

```bash
cp .env.local.example .env.local
# fill in BOLNA_API_KEY, BOLNA_AGENT_ID, Supabase keys, WEBHOOK_SECRET
pnpm install
pnpm dev
```

For local webhook testing, expose port 3000 with [ngrok](https://ngrok.com) and use the ngrok URL in Bolna's webhook config.

### 4. Deploy to Vercel

```bash
vercel link
vercel env add BOLNA_API_KEY
vercel env add BOLNA_AGENT_ID
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add WEBHOOK_SECRET
vercel --prod
```

Update Bolna's webhook URL to the production URL once deployed.

## Demo flow

1. Open the deployed app → **New role** → fill in title, company, JD summary, location, target experience, max budget.
2. Drop `bolna/sample-candidates.csv` (or your own) into the upload box. Phones are normalized to E.164 (assumes +91 if 10 digits).
3. Click **Screen N pending** → Bolna places calls in sequence.
4. As each call completes, the dashboard updates in realtime: status pill flips to `Completed`, rank score appears.
5. Click **Details** on any row to see the full transcript and extracted fields.
6. Click **Export shortlist** to download a CSV sorted by rank score, ready for ATS import.

## Project layout

```
app/
  page.tsx                          Roles list
  roles/new/page.tsx                Create role form
  roles/[id]/page.tsx               Role dashboard (server)
  api/
    roles/route.ts                  POST/GET /api/roles
    roles/[id]/export/route.ts      GET CSV export sorted by rank
    candidates/upload/route.ts      POST candidates for a role
    calls/trigger/route.ts          POST single Bolna /call
    calls/trigger-batch/route.ts    POST sequential batch
    webhooks/bolna/[secret]/        POST receives execution_complete
components/
  RoleDashboard.tsx                 Realtime client; stats + table + upload
  CandidateTable.tsx                Sorted, expandable transcript drawer
  UploadDropzone.tsx                CSV parse + preview + commit
  StatusPill.tsx
lib/
  bolna.ts                          triggerCall + webhook payload parser
  ranking.ts                        rankScore() — transparent 0-100 heuristic
  csv.ts                            Papa Parse + E.164 normalization
  supabase/{server,client}.ts
  types.ts
supabase/schema.sql                 Run once in Supabase SQL editor
bolna/agent-prompt.md               Agent prompts for Bolna playground
bolna/sample-candidates.csv         3 fake rows for demo
```

## Out of scope (and why)

- **Auth / multi-tenancy** — single demo user; the dashboard is unauthenticated. With auth, add an `owner_id` column and RLS policies.
- **ATS integrations (Greenhouse/Lever)** — the CSV export is the integration seam.
- **SMS fallback for `no_answer`** — clear next step.
- **Multi-language support** — Bolna supports it natively; not wired up here.

## Verification checklist

All boxes confirmed against the deployed app at https://bolna-recruit-screen.vercel.app:

- [x] `pnpm build` succeeds (Vercel deploys clean)
- [x] Bolna playground call to a verified number returns all 7 extracted fields
- [x] `POST /api/calls/trigger` returns `execution_id` (uses Bolna's `user_data` field for variable substitution)
- [x] Webhook lands → row appears in `screenings` (only on terminal status events)
- [x] Dashboard updates without manual refresh (Realtime + 2s polling fallback)
- [x] `Export shortlist` downloads sorted CSV

## Notes from build

A few non-obvious things this implementation handles:

- **`user_data`, not `dynamic_data`** — Bolna's `/call` endpoint accepts dynamic template variables under `user_data`. Other field names are silently ignored by the API.
- **Filter non-terminal webhooks** — Bolna fires multiple webhooks per execution (in-progress, completed). Only `status: completed | failed | missed | no_answer` are processed; others are acked but ignored to avoid clobbering completed data with empty in-progress payloads.
- **Round float→int** — Bolna sends `conversation_duration` as a float (e.g. `91.8`), but `duration_seconds` is `INT` in Postgres. The webhook handler `Math.round`s before upsert; the upsert error is now surfaced as a 500 instead of being silently swallowed.
- **Polling fallback** — even though Realtime is wired up, Supabase's per-table Realtime toggle defaults off in some projects; a 2s/6s polling pass guarantees UI convergence regardless.
