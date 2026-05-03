import Papa from "papaparse";
import { formatPhone, isValidE164 } from "./utils";

export type ParsedCandidate = {
  name: string;
  phone: string;
};

export type ParseResult = {
  rows: ParsedCandidate[];
  errors: { row: number; reason: string }[];
};

export function parseCandidatesCsv(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows: ParsedCandidate[] = [];
        const errors: ParseResult["errors"] = [];
        result.data.forEach((raw, i) => {
          const lower: Record<string, string> = {};
          for (const [k, v] of Object.entries(raw)) {
            lower[k.trim().toLowerCase()] = String(v ?? "").trim();
          }
          const name = lower["name"] || lower["full name"] || lower["candidate"];
          const phoneRaw = lower["phone"] || lower["mobile"] || lower["number"];
          if (!name) {
            errors.push({ row: i + 2, reason: "missing name" });
            return;
          }
          if (!phoneRaw) {
            errors.push({ row: i + 2, reason: "missing phone" });
            return;
          }
          const phone = formatPhone(phoneRaw);
          if (!isValidE164(phone)) {
            errors.push({ row: i + 2, reason: `invalid phone: ${phoneRaw}` });
            return;
          }
          rows.push({ name, phone });
        });
        resolve({ rows, errors });
      },
      error: (err) => reject(err),
    });
  });
}

export function toCsv(rows: Record<string, unknown>[]): string {
  return Papa.unparse(rows);
}
