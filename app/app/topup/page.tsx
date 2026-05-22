"use client";

import { ArrowDownToLine, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiPost } from "@/lib/api-client";
import { formatRwf } from "@/lib/format";
import { usePrimaryAccount } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

type Source = "bank_transfer" | "mtn_momo" | "airtel_money" | "cash_deposit";

const SOURCES: { value: Source; label: string; hint: string }[] = [
  { value: "bank_transfer", label: "Bank transfer", hint: "Add from a linked bank" },
  { value: "mtn_momo", label: "MTN MoMo", hint: "Top up from your MoMo wallet" },
  { value: "airtel_money", label: "Airtel Money", hint: "Top up from Airtel Money" },
  { value: "cash_deposit", label: "Cash deposit", hint: "Bank branch or agent" },
];

const QUICK_AMOUNTS = [5_000, 10_000, 25_000, 50_000, 100_000, 500_000];

interface DepositData {
  tx_id: string;
  amount_rwf: number;
  source: Source;
}

export default function TopUpPage() {
  const { user } = useAuth();
  const account = usePrimaryAccount(user?.uid);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<Source>("bank_transfer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount.replace(/[^0-9]/g, ""));
  const canSubmit = numericAmount > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await apiPost<DepositData>("/api/deposits", {
      body: { amount_rwf: numericAmount, source },
    });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    toast.success(`${formatRwf(numericAmount)} added to your balance`);
    setAmount("");
  }

  if (!user) return null;

  return (
    <div className="space-y-8">
      <PageHeader subtitle="Money" title="Top up" />

      <div className="mx-auto max-w-lg space-y-6">
        {/* Balance preview */}
        {account.loading || !account.data ? (
          <Skeleton className="h-20 w-full rounded-2xl bg-neutral-100" />
        ) : (
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-500">
              Current balance
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-neutral-900">
              {formatRwf(account.data.balance_rwf)}
            </p>
            {numericAmount > 0 && (
              <p className="mt-2 text-sm text-emerald-700">
                After top-up:{" "}
                <span className="font-medium tabular-nums">
                  {formatRwf(account.data.balance_rwf + numericAmount)}
                </span>
              </p>
            )}
          </section>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6"
        >
          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="amount" className="text-sm font-medium text-neutral-800">
              Amount (RWF)
            </label>
            <Input
              id="amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10000"
              className="h-12 border-neutral-300 bg-white text-lg font-medium text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  +{formatRwf(v)}
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-neutral-800">Source</p>
            <ul className="space-y-1.5">
              {SOURCES.map((s) => {
                const active = source === s.value;
                return (
                  <li key={s.value}>
                    <button
                      type="button"
                      onClick={() => setSource(s.value)}
                      className={
                        "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors " +
                        (active
                          ? "border-neutral-900 bg-neutral-50"
                          : "border-neutral-200 bg-white hover:bg-neutral-50")
                      }
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {s.label}
                        </p>
                        <p className="text-xs text-neutral-500">{s.hint}</p>
                      </div>
                      {active && (
                        <CheckCircle2 className="h-4 w-4 text-neutral-900" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {error && (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-11 w-full bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                Add {numericAmount > 0 ? formatRwf(numericAmount) : "money"}
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-neutral-500">
          This is a demo build — no real money moves. The top-up is recorded as
          a transfer-in and immediately credits your balance.
        </p>
      </div>
    </div>
  );
}
