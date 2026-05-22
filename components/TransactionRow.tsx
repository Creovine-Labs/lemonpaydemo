"use client";

import Link from "next/link";
import {
  Banknote,
  Coffee,
  Fuel,
  Plane,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  Utensils,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { formatRwf, formatRelativeShort, toDate } from "@/lib/format";
import type { Transaction, WithId } from "@/lib/types";

interface TransactionRowProps {
  tx: WithId<Transaction>;
  /** Pass href base to make the row a link to the detail page. */
  hrefBase?: string;
}

export function TransactionRow({ tx, hrefBase = "/app/transactions" }: TransactionRowProps) {
  const Icon = iconForCategory(tx.merchant_category);
  const date = toDate(tx.posted_at);
  const sign = isCredit(tx.type) ? "+" : "−";
  const amountClass = isCredit(tx.type)
    ? "text-emerald-600"
    : tx.status === "declined"
      ? "text-neutral-400 line-through"
      : "text-neutral-900";

  const content = (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-neutral-100 text-neutral-700 sm:h-11 sm:w-11">
        <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
      </div>

      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-6">
        <div className="min-w-0 sm:flex-1">
          <p className="truncate text-sm font-medium text-neutral-900">
            {tx.merchant_name}
          </p>
          <p className="truncate text-xs text-neutral-500">
            {tx.merchant_category}
            {tx.status !== "posted" && (
              <span className="ml-2 text-[10px] uppercase tracking-widest text-neutral-500">
                · {tx.status}
              </span>
            )}
          </p>
        </div>

        <div className="hidden text-xs text-neutral-500 sm:block sm:w-28 sm:flex-none sm:text-right">
          {date ? formatRelativeShort(date) : "—"}
        </div>

        <div className="text-right sm:w-32 sm:flex-none">
          <p className={`text-sm font-medium tabular-nums ${amountClass}`}>
            {sign}
            {formatRwf(tx.amount_rwf)}
          </p>
          <p className="text-xs text-neutral-500 sm:hidden">
            {date ? formatRelativeShort(date) : "—"}
          </p>
        </div>
      </div>
    </div>
  );

  if (!hrefBase) return <div className="py-3">{content}</div>;

  return (
    <Link
      href={`${hrefBase}/${tx.id}`}
      className="block rounded-lg px-2 py-3 transition-colors hover:bg-neutral-100/80"
    >
      {content}
    </Link>
  );
}

function isCredit(type: Transaction["type"]): boolean {
  return type === "refund" || type === "transfer_in";
}

function iconForCategory(category: string): ComponentType<SVGProps<SVGSVGElement>> {
  const c = category.toLowerCase();
  if (c.includes("grocer")) return ShoppingCart;
  if (c.includes("restaurant")) return Utensils;
  if (c.includes("coffee") || c.includes("cafe")) return Coffee;
  if (c.includes("fuel")) return Fuel;
  if (c.includes("travel")) return Plane;
  if (c.includes("subscription")) return Smartphone;
  if (c.includes("online") || c.includes("shop")) return ShoppingBag;
  if (c.includes("transfer")) return Repeat;
  if (c.includes("cash")) return Banknote;
  return Store;
}
