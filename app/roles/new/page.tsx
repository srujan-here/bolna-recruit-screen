"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewRolePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: fd.get("title"),
      company_name: fd.get("company_name"),
      jd_summary: fd.get("jd_summary"),
      location: fd.get("location"),
      target_min_years: Number(fd.get("target_min_years") || 3),
      max_budget_lakhs: Number(fd.get("max_budget_lakhs") || 30),
    };
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "failed");
      setSubmitting(false);
      return;
    }
    const role = await res.json();
    router.push(`/roles/${role.id}`);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">New role</h1>
      <p className="text-muted text-sm mt-1">
        Aria uses these fields to personalize each call via Bolna&apos;s
        <code className="px-1 mx-1 rounded bg-panel border border-border text-xs">
          dynamic_data
        </code>
        .
      </p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
        <div>
          <label className="label">Role title</label>
          <input name="title" required className="input" placeholder="Senior Backend Engineer" />
        </div>
        <div>
          <label className="label">Company</label>
          <input name="company_name" required className="input" placeholder="Acme Inc." />
        </div>
        <div>
          <label className="label">Location</label>
          <input name="location" className="input" placeholder="Bengaluru" />
        </div>
        <div>
          <label className="label">JD summary (1-2 lines)</label>
          <textarea
            name="jd_summary"
            rows={3}
            className="input"
            placeholder="Python + Django, 4+ yrs, scale 10M+ DAU, payments domain"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Target min experience (yrs)</label>
            <input name="target_min_years" type="number" defaultValue={3} min={0} className="input" />
          </div>
          <div>
            <label className="label">Max budget (₹ lakhs)</label>
            <input name="max_budget_lakhs" type="number" defaultValue={30} min={0} className="input" />
          </div>
        </div>
        {error && <div className="text-bad text-sm">{error}</div>}
        <div className="pt-2">
          <button disabled={submitting} className="btn-primary">
            {submitting ? "Creating…" : "Create role"}
          </button>
        </div>
      </form>
    </div>
  );
}
