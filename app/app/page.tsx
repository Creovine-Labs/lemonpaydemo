"use client";

import Link from "next/link";
import { BalanceCard } from "@/components/BalanceCard";
import { PageHeader } from "@/components/PageHeader";
import { QuickActions } from "@/components/QuickActions";
import { TransactionRow } from "@/components/TransactionRow";
import { VirtualCard } from "@/components/VirtualCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCards,
  usePrimaryAccount,
  useTransactions,
  useUserDoc,
} from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

export default function HomePage() {
  const { user } = useAuth();
  const uid = user?.uid;

  const profile = useUserDoc(uid);
  const account = usePrimaryAccount(uid);
  const recent = useTransactions(uid, 5);
  const cards = useCards(uid);
  const primaryCard = cards.data[0];

  if (!user) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        subtitle={`Hi, ${firstName(profile.data?.full_name) || "there"}`}
        title="Overview"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: balance + quick actions + activity */}
        <div className="space-y-6 lg:col-span-2">
          {account.loading || !account.data ? (
            <Skeleton className="h-40 w-full rounded-2xl bg-neutral-100" />
          ) : (
            <BalanceCard
              balanceRwf={account.data.balance_rwf}
              accountNumberMasked={account.data.account_number_masked}
              accountType={account.data.type}
            />
          )}

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">
              Quick actions
            </h2>
            <QuickActions />
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-neutral-900">
                Recent activity
              </h2>
              <Link
                href="/app/transactions"
                className="text-sm font-medium text-neutral-700 underline-offset-4 hover:underline"
              >
                See all
              </Link>
            </div>

            {recent.loading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-lg bg-neutral-100" />
                <Skeleton className="h-14 w-full rounded-lg bg-neutral-100" />
                <Skeleton className="h-14 w-full rounded-lg bg-neutral-100" />
              </div>
            ) : recent.data.length === 0 ? (
              <p className="rounded-lg border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-500">
                No transactions yet.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {recent.data.map((tx) => (
                  <li key={tx.id}>
                    <TransactionRow tx={tx} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right column: card preview */}
        <div className="space-y-6">
          {primaryCard && (
            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-neutral-900">
                  Your card
                </h2>
                <Link
                  href={`/app/cards/${primaryCard.id}`}
                  className="text-xs font-medium text-neutral-700 underline-offset-4 hover:underline"
                >
                  Manage
                </Link>
              </div>
              <Link
                href={`/app/cards/${primaryCard.id}`}
                className="block transition-transform hover:scale-[1.01]"
              >
                <VirtualCard
                  card={primaryCard}
                  holderName={profile.data?.full_name ?? ""}
                />
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function firstName(full?: string): string {
  if (!full) return "";
  return full.trim().split(/\s+/)[0];
}
