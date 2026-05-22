"use client";

import { Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatRwf } from "@/lib/format";

interface BalanceCardProps {
  balanceRwf: number;
  accountNumberMasked: string;
  accountType: "checking" | "savings";
}

export function BalanceCard({
  balanceRwf,
  accountNumberMasked,
  accountType,
}: BalanceCardProps) {
  const [hidden, setHidden] = useState(false);

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(accountNumberMasked);
      toast.success("Account number copied");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  return (
    <section
      className="rounded-2xl border border-neutral-200 bg-white p-6"
      aria-labelledby="balance-heading"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            id="balance-heading"
            className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-500"
          >
            {accountType} balance
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
            {hidden ? "RWF • • • • • •" : formatRwf(balanceRwf)}
          </p>
          <button
            type="button"
            onClick={copyAccount}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            <span className="font-mono">{accountNumberMasked}</span>
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? "Show balance" : "Hide balance"}
          className="rounded-full border border-neutral-200 p-2 text-neutral-700 transition-colors hover:bg-neutral-100"
        >
          {hidden ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>
      </div>
    </section>
  );
}
