"use client";

import { PenLine } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeShort, toDate } from "@/lib/format";
import { useEmails } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";
import type { Email, WithId } from "@/lib/types";

interface Thread {
  thread_id: string;
  latest: WithId<Email>;
  count: number;
  hasUnread: boolean;
}

export default function InboxPage() {
  const { user } = useAuth();
  const emails = useEmails(user?.uid);

  const threads = useMemo<Thread[]>(() => {
    const map = new Map<string, Thread>();
    for (const e of emails.data) {
      const existing = map.get(e.thread_id);
      const ms = toDate(e.sent_at)?.getTime() ?? 0;
      const existingMs = existing ? toDate(existing.latest.sent_at)?.getTime() ?? 0 : -1;
      if (!existing) {
        map.set(e.thread_id, {
          thread_id: e.thread_id,
          latest: e,
          count: 1,
          hasUnread: e.direction === "inbound" && !e.read,
        });
      } else {
        existing.count++;
        if (ms > existingMs) existing.latest = e;
        if (e.direction === "inbound" && !e.read) existing.hasUnread = true;
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const aMs = toDate(a.latest.sent_at)?.getTime() ?? 0;
      const bMs = toDate(b.latest.sent_at)?.getTime() ?? 0;
      return bMs - aMs;
    });
  }, [emails.data]);

  if (!user) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        subtitle="Support"
        title="Inbox"
        actions={
          <Button className="h-10 bg-neutral-900 text-white hover:bg-neutral-800">
            <Link href="/app/inbox/compose" className="flex items-center gap-1.5">
              <PenLine className="h-4 w-4" />
              Compose
            </Link>
          </Button>
        }
      />

      {emails.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-20 w-full rounded-2xl bg-neutral-100"
            />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-16 text-center text-sm text-neutral-500">
          Inbox is empty. Tap <span className="font-medium text-neutral-700">Compose</span> to start a thread.
        </div>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.thread_id}>
              <Link
                href={`/app/inbox/${t.thread_id}`}
                className="block rounded-2xl border border-neutral-200 bg-white px-5 py-4 transition-colors hover:bg-neutral-50"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {t.hasUnread && (
                      <span
                        aria-label="Unread"
                        className="h-2 w-2 rounded-full bg-neutral-900"
                      />
                    )}
                    <p className="text-sm font-medium text-neutral-900">
                      {t.latest.subject}
                    </p>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {(() => {
                      const d = toDate(t.latest.sent_at);
                      return d ? formatRelativeShort(d) : "";
                    })()}
                  </p>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
                  {t.latest.direction === "outbound" ? "You: " : "Support: "}
                  {t.latest.body}
                </p>
                {t.count > 1 && (
                  <p className="mt-1 text-[11px] uppercase tracking-widest text-neutral-400">
                    {t.count} messages
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
