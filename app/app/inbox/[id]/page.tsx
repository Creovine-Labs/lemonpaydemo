"use client";

import { use, useMemo } from "react";
import { ComposeEmail } from "@/components/ComposeEmail";
import { EmailThread } from "@/components/EmailThread";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmails } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

export default function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const emails = useEmails(user?.uid);

  const threadEmails = useMemo(
    () => emails.data.filter((e) => e.thread_id === id),
    [emails.data, id],
  );

  if (!user) return null;

  const subject =
    threadEmails[0]?.subject ?? (emails.loading ? "Loading…" : "Thread");

  return (
    <div className="space-y-8">
      <PageHeader subtitle="Support" title={subject} back="/app/inbox" />

      {emails.loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl bg-neutral-100" />
          <Skeleton className="h-28 w-full rounded-2xl bg-neutral-100" />
        </div>
      ) : threadEmails.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-16 text-center text-sm text-neutral-500">
          Thread not found.
        </p>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6">
          <EmailThread emails={threadEmails} />

          <div>
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">Reply</h2>
            <ComposeEmail
              uid={user.uid}
              fromEmail={user.email ?? ""}
              threadId={id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
