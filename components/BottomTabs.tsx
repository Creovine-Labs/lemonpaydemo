"use client";

import { CreditCard, Home, Receipt, Send, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

interface Tab {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  match: (pathname: string) => boolean;
}

const TABS: Tab[] = [
  { href: "/app", label: "Home", Icon: Home, match: (p) => p === "/app" },
  {
    href: "/app/cards",
    label: "Cards",
    Icon: CreditCard,
    match: (p) => p.startsWith("/app/cards"),
  },
  {
    href: "/app/transfers",
    label: "Send",
    Icon: Send,
    match: (p) => p.startsWith("/app/transfers"),
  },
  {
    href: "/app/pay",
    label: "Pay",
    Icon: Receipt,
    match: (p) => p.startsWith("/app/pay") || p.startsWith("/app/topup"),
  },
  {
    href: "/app/settings",
    label: "Settings",
    Icon: Settings,
    match: (p) => p.startsWith("/app/settings"),
  },
];

/**
 * Mobile-only bottom navigation. Hidden on md+ where the sidebar handles
 * navigation.
 */
export function BottomTabs() {
  const pathname = usePathname() ?? "/app";

  return (
    <nav className="sticky bottom-0 z-20 border-t border-neutral-200 bg-white/95 px-2 pt-2 pb-3 backdrop-blur md:hidden">
      <ul className="flex items-stretch justify-between">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={
                  "flex flex-col items-center gap-1 rounded-md py-1.5 text-[11px] transition-colors " +
                  (active
                    ? "text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-700")
                }
              >
                <tab.Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
