"use client";

import { useRef, useState } from "react";
import { parseCandidatesCsv, type ParsedCandidate } from "@/lib/csv";

export default function UploadDropzone({
  roleId,
  onUploaded,
}: {
  roleId: string;
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<ParsedCandidate[] | null>(null);

  async function onFile(f: File) {
    setBusy(true);
    setErrors([]);
    const result = await parseCandidatesCsv(f);
    setBusy(false);
    if (result.errors.length) {
      setErrors(result.errors.map((e) => `Row ${e.row}: ${e.reason}`));
    }
    setPreview(result.rows);
  }

  async function commit() {
    if (!preview || preview.length === 0) return;
    setBusy(true);
    const res = await fetch("/api/candidates/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id: roleId, candidates: preview }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErrors([j.error ?? "upload failed"]);
      return;
    }
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    onUploaded();
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-medium">Upload candidates</div>
          <div className="text-xs text-muted mt-1">
            CSV with columns <code>name</code> and <code>phone</code>. Phones are
            normalized to E.164 (assumes +91 if 10 digits).
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="text-sm file:btn file:mr-3 file:cursor-pointer"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>

      {errors.length > 0 && (
        <ul className="mt-3 text-xs text-bad space-y-0.5">
          {errors.map((e, i) => (
            <li key={i}>• {e}</li>
          ))}
        </ul>
      )}

      {preview && preview.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="text-xs text-muted mb-2">
            {preview.length} valid row(s) ready to import
          </div>
          <div className="max-h-40 overflow-auto rounded border border-border">
            <table className="w-full text-xs">
              <thead className="bg-[#161a22] text-muted">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Phone</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 font-mono">{r.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={commit} disabled={busy} className="btn-primary">
              {busy ? "Importing…" : `Import ${preview.length}`}
            </button>
            <button
              onClick={() => {
                setPreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
