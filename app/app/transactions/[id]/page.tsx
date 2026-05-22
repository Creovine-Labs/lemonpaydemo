"use client";

import { use } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TransactionDetail } from "@/components/TransactionDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransaction } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const tx = useTransaction(id);

  if (!user) return null;

  const isOwned = !tx.data || tx.data.user_id === user.uid;

  return (
    <div className="space-y-8">
      <PageHeader
        subtitle="Transaction"
        title="Detail"
        back="/app/transactions"
      />

      <div className="mx-auto max-w-lg">
        {tx.loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl bg-neutral-100" />
            <Skeleton className="h-48 w-full rounded-2xl bg-neutral-100" />
          </div>
        ) : !tx.data || !isOwned ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 bg-white px-4 py-16 text-center text-sm text-neutral-500">
            {tx.error ?? "Transaction not found."}
          </p>
        ) : (
          <TransactionDetail tx={tx.data} />
        )}
      </div>
    </div>
  );
}
