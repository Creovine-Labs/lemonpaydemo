"use client";

import { LimitsPanel } from "@/components/LimitsPanel";
import { PageHeader } from "@/components/PageHeader";
import { useLimitRequests } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

export default function LimitsPage() {
  const { user } = useAuth();
  const requests = useLimitRequests(user?.uid);

  if (!user) return null;

  return (
    <div className="space-y-8">
      <PageHeader subtitle="Settings" title="Limits" back="/app/settings" />

      <div className="mx-auto max-w-2xl space-y-6">
        <p className="text-sm text-neutral-600">
          Lemonpay enforces these caps on your account. Need more? Request an
          increase and we&apos;ll review it.
        </p>
        <LimitsPanel uid={user.uid} pendingRequests={requests.data} />
      </div>
    </div>
  );
}
