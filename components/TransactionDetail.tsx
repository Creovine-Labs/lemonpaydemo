"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatFullDate, formatRwf, toDate } from "@/lib/format";
import type { Transaction, WithId } from "@/lib/types";

interface TransactionDetailProps {
  tx: WithId<Transaction>;
}

export function TransactionDetail({ tx }: TransactionDetailProps) {
  const date = toDate(tx.posted_at);
  const isCredit = tx.type === "refund" || tx.type === "transfer_in";

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
      <header className="text-center">
        <p className="text-sm text-neutral-600">{tx.merchant_name}</p>
        <p
          className={
            "mt-1 text-3xl font-semibold tabular-nums sm:text-4xl " +
            (isCredit ? "text-emerald-600" : "text-neutral-900")
          }
        >
          {isCredit ? "+" : "−"}
          {formatRwf(tx.amount_rwf)}
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <StatusBadge status={tx.status} />
          <span className="text-xs text-neutral-500">{tx.merchant_category}</span>
        </div>
      </header>

      <Separator className="bg-neutral-200" />

      <dl className="space-y-3 text-sm">
        <DetailRow label="Date" value={date ? formatFullDate(date) : "—"} />
        <DetailRow label="Type" value={titleCase(tx.type.replace("_", " "))} />
        <DetailRow label="Status" value={titleCase(tx.status)} />
        <DetailRow label="Merchant ID" value={tx.merchant_id} mono />
        {tx.flutterwave_tx_ref && (
          <DetailRow
            label="Reference"
            value={tx.flutterwave_tx_ref}
            mono
            truncate
          />
        )}
        {tx.card_id && (
          <DetailRow label="Card" value={tx.card_id} mono truncate />
        )}
      </dl>

      {tx.metadata && Object.keys(tx.metadata).length > 0 && (
        <>
          <Separator className="bg-neutral-200" />
          <details className="text-xs text-neutral-600">
            <summary className="cursor-pointer text-neutral-500 hover:text-neutral-700">
              Metadata
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-neutral-50 p-3 font-mono text-[11px] text-neutral-700">
              {JSON.stringify(tx.metadata, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Transaction["status"] }) {
  const cls =
    status === "posted"
      ? "bg-neutral-100 text-neutral-700"
      : status === "pending"
        ? "bg-amber-100 text-amber-800"
        : status === "declined"
          ? "bg-rose-100 text-rose-800"
          : status === "refunded"
            ? "bg-emerald-100 text-emerald-800"
            : "bg-sky-100 text-sky-800";
  return (
    <Badge
      className={`border-0 text-[10px] font-medium uppercase tracking-widest ${cls}`}
    >
      {status}
    </Badge>
  );
}

function DetailRow({
  label,
  value,
  mono,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-neutral-500">{label}</dt>
      <dd
        className={
          "text-right text-neutral-800 " +
          (mono ? "font-mono text-xs " : "") +
          (truncate ? "max-w-[60%] truncate" : "")
        }
        title={truncate ? value : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
