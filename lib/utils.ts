import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(p: string): string {
  const cleaned = p.replace(/\D/g, "");
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
  if (p.startsWith("+")) return p;
  return `+${cleaned}`;
}

export function isValidE164(p: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(p);
}
