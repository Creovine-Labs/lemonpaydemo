"use client";

import { PageHeader } from "@/components/PageHeader";
import { TransferForm } from "@/components/TransferForm";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrimaryAccount } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

export default function TransfersPage() {
  const { user } = useAuth();
  const account = usePrimaryAccount(user?.uid);

  if (!user) return null;

  return (
    <div className="space-y-8">
      <PageHeader subtitle="Money" title="Send" />

      <div className="mx-auto max-w-lg">
        {account.loading ? (
          <Skeleton className="h-96 w-full rounded-2xl bg-neutral-100" />
        ) : (
          <TransferForm balanceRwf={account.data?.balance_rwf ?? null} />
        )}
      </div>
    </div>
  );
}
