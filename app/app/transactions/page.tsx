"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TransactionRow } from "@/components/TransactionRow";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeShort, toDate } from "@/lib/format";
import { useTransactions } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";
import type { Transaction, WithId } from "@/lib/types";

export default function TransactionsPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const txs = useTransactions(uid);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return txs.data;
    return txs.data.filter((t) => {
      return (
        t.merchant_name.toLowerCase().includes(q) ||
        t.merchant_category.toLowerCase().includes(q) ||
        String(t.amount_rwf).includes(q)
      );
    });
  }, [txs.data, search]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  if (!user) return null;

  return (
    <div className="space-y-8">
      <PageHeader subtitle="Activity" title="Transactions" />

      <div className="rounded-2xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchant, category, amount"
              className="h-10 border-neutral-200 bg-white pl-9 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
            />
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {txs.loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-14 w-full rounded-lg bg-neutral-100"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-200 px-4 py-12 text-center text-sm text-neutral-500">
              {search ? `No matches for "${search}".` : "No transactions yet."}
            </p>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <section key={group.key}>
                  <h2 className="mb-1 text-xs font-medium uppercase tracking-[0.15em] text-neutral-500">
                    {group.label}
                  </h2>
                  <ul className="divide-y divide-neutral-100">
                    {group.items.map((tx) => (
                      <li key={tx.id}>
                        <TransactionRow tx={tx} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface Group {
  key: string;
  label: string;
  items: WithId<Transaction>[];
}

function groupByDay(items: WithId<Transaction>[]): Group[] {
  const groups = new Map<string, Group>();
  for (const tx of items) {
    const date = toDate(tx.posted_at);
    if (!date) continue;
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
    const label = formatRelativeShort(
      new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          12,
          0,
          0,
        ),
      ),
    ).split(",")[0];
    const existing = groups.get(key);
    if (existing) existing.items.push(tx);
    else groups.set(key, { key, label, items: [tx] });
  }
  return Array.from(groups.values());
}
