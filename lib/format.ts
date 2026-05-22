import type { Timestamp } from "firebase/firestore";

const RWF_FORMATTER = new Intl.NumberFormat("en-RW", {
  style: "currency",
  currency: "RWF",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatRwf(amount: number): string {
  return RWF_FORMATTER.format(amount);
}

/** Compact form for tight UI: "RWF 12.5k", "RWF 1.62M". */
export function formatRwfCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `RWF ${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `RWF ${(amount / 1_000).toFixed(1)}k`;
  }
  return `RWF ${amount}`;
}

/** Accepts either a Firestore Timestamp or a plain Date. */
export function toDate(ts: Timestamp | Date | null | undefined): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof (ts as Timestamp).toDate === "function") {
    return (ts as Timestamp).toDate();
  }
  return null;
}

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});
const FULL_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const TIME_ONLY = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

/** "Today, 14:32", "Yesterday, 09:00", "12 May" — for transaction rows. */
export function formatRelativeShort(date: Date): string {
  const now = new Date();
  const sameDay =
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate();
  if (sameDay) return `Today, ${TIME_ONLY.format(date)}`;

  const yesterday = new Date(now);
  yesterday.setUTCDate(now.getUTCDate() - 1);
  const isYesterday =
    date.getUTCFullYear() === yesterday.getUTCFullYear() &&
    date.getUTCMonth() === yesterday.getUTCMonth() &&
    date.getUTCDate() === yesterday.getUTCDate();
  if (isYesterday) return `Yesterday, ${TIME_ONLY.format(date)}`;

  return SHORT_DATE.format(date);
}

export function formatFullDate(date: Date): string {
  return FULL_DATE.format(date);
}

export function maskAccountNumber(masked: string): string {
  return masked;
}
