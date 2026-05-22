"use client";

import { formatFullDate, toDate } from "@/lib/format";
import type { Email, WithId } from "@/lib/types";

interface EmailThreadProps {
  emails: WithId<Email>[];
}

export function EmailThread({ emails }: EmailThreadProps) {
  const sorted = [...emails].sort((a, b) => {
    const aMs = toDate(a.sent_at)?.getTime() ?? 0;
    const bMs = toDate(b.sent_at)?.getTime() ?? 0;
    return aMs - bMs;
  });

  return (
    <ol className="space-y-3">
      {sorted.map((e) => (
        <li
          key={e.id}
          className={
            "rounded-2xl border bg-white p-5 shadow-sm " +
            (e.direction === "outbound"
              ? "border-neutral-200"
              : "border-neutral-200 bg-neutral-50/60")
          }
        >
          <header className="flex items-center justify-between gap-3 text-xs text-neutral-500">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-white">
                {e.direction === "outbound" ? "You" : "Support"}
              </span>
              <span className="font-mono text-neutral-600">{e.from}</span>
            </div>
            <span>
              {(() => {
                const d = toDate(e.sent_at);
                return d ? formatFullDate(d) : "";
              })()}
            </span>
          </header>
          <p className="mt-3 text-sm font-medium text-neutral-900">{e.subject}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">
            {e.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
