"use client";

import { useRouter } from "next/navigation";
import { ComposeEmail } from "@/components/ComposeEmail";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/use-auth";

export default function ComposeEmailPage() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-8">
      <PageHeader subtitle="Support" title="New message" back="/app/inbox" />
      <div className="mx-auto max-w-2xl">
        <ComposeEmail
          uid={user.uid}
          fromEmail={user.email ?? ""}
          onSent={(threadId) => router.push(`/app/inbox/${threadId}`)}
        />
      </div>
    </div>
  );
}
