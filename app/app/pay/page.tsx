"use client";

import { useState } from "react";
import { AirtimeForm } from "@/components/AirtimeForm";
import { ElectricityForm } from "@/components/ElectricityForm";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRwf } from "@/lib/format";
import { usePrimaryAccount } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

type Tab = "electricity" | "airtime";

export default function PayPage() {
  const { user } = useAuth();
  const account = usePrimaryAccount(user?.uid);
  const [tab, setTab] = useState<Tab>("electricity");

  if (!user) return null;

  return (
    <div className="space-y-8">
      <PageHeader subtitle="Money" title="Pay bills" />

      <div className="mx-auto max-w-lg space-y-6">
        {/* Balance preview */}
        {account.loading || !account.data ? (
          <Skeleton className="h-20 w-full rounded-2xl bg-neutral-100" />
        ) : (
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-500">
              Available to spend
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-neutral-900">
              {formatRwf(account.data.balance_rwf)}
            </p>
          </section>
        )}

        {/* Tabs */}
        <div className="flex rounded-xl border border-neutral-200 bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setTab("electricity")}
            className={
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors " +
              (tab === "electricity"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900")
            }
          >
            Electricity
          </button>
          <button
            type="button"
            onClick={() => setTab("airtime")}
            className={
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors " +
              (tab === "airtime"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900")
            }
          >
            Airtime
          </button>
        </div>

        {tab === "electricity" ? (
          <ElectricityForm balanceRwf={account.data?.balance_rwf ?? null} />
        ) : (
          <AirtimeForm balanceRwf={account.data?.balance_rwf ?? null} />
        )}
      </div>
    </div>
  );
}
