"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Card } from "@/lib/types";

interface VirtualCardProps {
  card: Card;
  holderName: string;
  /** Optional full PAN if available (Flutterwave reveal in Phase 4). */
  fullNumber?: string;
}

/**
 * The hero card visual. Stays dark — real cards look like real cards. The
 * surrounding UI is light, so this gives the card visual its own presence.
 */
export function VirtualCard({ card, holderName, fullNumber }: VirtualCardProps) {
  const [revealed, setRevealed] = useState(false);
  const display = revealed && fullNumber
    ? formatPan(fullNumber)
    : maskedFromLast4(card.last4);

  const tone =
    card.status === "active"
      ? "from-neutral-800 via-neutral-900 to-black"
      : card.status === "frozen"
        ? "from-slate-700 via-slate-900 to-black"
        : "from-rose-950 via-neutral-900 to-black";

  return (
    <div
      className={`relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl bg-gradient-to-br ${tone} p-5 text-neutral-50 shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Chip />
          <span className="text-xs font-medium uppercase tracking-widest text-neutral-300">
            Lemonpay
          </span>
        </div>
        <StatusBadge status={card.status} />
      </div>

      <div className="absolute right-5 bottom-5 left-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-base tracking-[0.2em] text-neutral-100 sm:text-lg">
            {display}
          </span>
          {fullNumber && (
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              aria-label={revealed ? "Hide card number" : "Reveal card number"}
              className="rounded-full bg-white/10 p-1.5 text-neutral-200 transition-colors hover:bg-white/20"
            >
              {revealed ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-widest text-neutral-400">
          <span className="truncate">{holderName || "Cardholder"}</span>
          <span className="font-mono">
            {String(card.expiry_month).padStart(2, "0")}/
            {String(card.expiry_year).slice(-2)}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Card["status"] }) {
  const cls =
    status === "active"
      ? "bg-neutral-200/15 text-neutral-200"
      : status === "frozen"
        ? "bg-sky-300/15 text-sky-200"
        : "bg-rose-400/15 text-rose-200";
  return (
    <Badge className={`border-0 text-[10px] font-medium uppercase tracking-widest ${cls}`}>
      {status}
    </Badge>
  );
}

function Chip() {
  return (
    <svg viewBox="0 0 24 18" className="h-5 w-7" aria-hidden="true">
      <rect width="24" height="18" rx="3" fill="#D4D4D4" opacity="0.9" />
      <g stroke="#404040" strokeWidth="0.6" fill="none" opacity="0.7">
        <path d="M3 6 L9 6 M3 12 L9 12 M15 6 L21 6 M15 12 L21 12" />
        <rect x="9" y="4" width="6" height="10" rx="1" />
      </g>
    </svg>
  );
}

function maskedFromLast4(last4: string): string {
  return `•••• •••• •••• ${last4}`;
}

function formatPan(pan: string): string {
  return pan.replace(/(.{4})/g, "$1 ").trim();
}
