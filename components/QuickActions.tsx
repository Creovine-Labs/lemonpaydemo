"use client";

import {
  ArrowDownToLine,
  HelpCircle,
  Receipt,
  Send,
  Smartphone,
  Snowflake,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

interface Action {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const ACTIONS: Action[] = [
  { href: "/app/topup", label: "Top up", Icon: ArrowDownToLine },
  { href: "/app/transfers", label: "Send", Icon: Send },
  { href: "/app/pay", label: "Pay bills", Icon: Receipt },
  { href: "/app/pay?tab=airtime", label: "Airtime", Icon: Smartphone },
  { href: "/app/cards", label: "Cards", Icon: Snowflake },
  { href: "/app/help", label: "Help", Icon: HelpCircle },
];

export function QuickActions() {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {ACTIONS.map((a) => (
        <li key={a.href}>
          <Link
            href={a.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2 py-4 text-center transition-colors hover:bg-neutral-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white">
              <a.Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-medium text-neutral-800">
              {a.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
