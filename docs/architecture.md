# Architecture

## Sequence: trigger + webhook round-trip

```
Recruiter (browser)
   │  POST /api/calls/trigger-batch { role_id }
   ▼
Next.js API route
   │  for each pending candidate:
   │    POST https://api.bolna.ai/call
   │      headers: Authorization: Bearer <BOLNA_API_KEY>
   │      body:    { agent_id, contact_number, dynamic_data: {...} }
   │  ← { execution_id }
   │  UPDATE candidates SET status='calling', bolna_execution_id=...
   ▼
Bolna places the call → Aria runs the script → call ends
   │
   ▼
Bolna POST https://<app>/api/webhooks/bolna/<WEBHOOK_SECRET>
   body: { execution_id, extracted_data, transcript, duration, status }
   │
   ▼
Next.js webhook route
   │  parseWebhook(body)              normalize fields
   │  rankScore(extracted, role)      transparent 0-100
   │  UPSERT screenings (onConflict: candidate_id)
   │  UPDATE candidates SET status='completed' (or 'no_answer')
   │
   ▼
Supabase Realtime broadcasts changes on the `role-<id>` channel
   │
   ▼
Browser dashboard re-renders: status pill flips, score appears.
```

## Key design choices

**Webhook auth via secret in path.** Bolna's docs don't clearly document an HMAC signature scheme, so we put a long random `WEBHOOK_SECRET` in the path. Bolna only needs the URL — no extra headers. Rotation = generate a new secret + update the agent's webhook URL. If/when Bolna adds proper HMAC, swap to header verification.

**Service role on the webhook.** The webhook route uses Supabase's service role key (server-only env). RLS is disabled for the demo; turn it on with an `owner_id` column when adding auth.

**Single screening row per candidate.** `screenings.candidate_id` has a unique index and we `upsert(onConflict: candidate_id)`. This makes Bolna webhook retries idempotent — the row just gets overwritten with the latest payload.

**Realtime over polling.** Both `candidates` and `screenings` are added to `supabase_realtime`. The dashboard subscribes once and lets the DB push changes — no setInterval, no SSE on Vercel.

**Defensive payload parsing.** `parseWebhook()` handles both flat `{ field: value }` shape and Bolna's nested `extracted_data: { Category: { Field: { subjective, objective } } }`. The full payload is also stored in `screenings.raw_payload` for debugging.

**Sequential batch with 200ms delay.** `/api/calls/trigger-batch` is sequential to stay well under Bolna's 500/min limit on `/call`. For larger jobs, switch to a queue + Vercel Cron.

## Ranking heuristic (`lib/ranking.ts`)

Transparent and easy to defend in the demo:

| Signal | Max | Logic |
|---|---|---|
| Interest | 30 | `is_interested === true` ⇒ 30; null ⇒ 10; false ⇒ 0 |
| Experience | 25 | `min(years / target_min_years, 1) × 25` |
| CTC fit | 20 | within budget ⇒ 20; linearly decays to 0 at 1.5× budget |
| Notice period | 15 | `(60 − days) / 60 × 15`, clamped 0..15 |
| Relocation | 10 | yes ⇒ 10, negotiable ⇒ 5, no ⇒ 0 |

Stored as `rank_score` on the screening row. Breakdown is recomputable from the raw extractions, so we keep the heuristic in code, not the DB.
