"use client";

import { signOut } from "firebase/auth";
import {
  CreditCard,
  Home,
  LogOut,
  Mail,
  Send,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { LemonLogo } from "@/components/LemonLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase-client";

interface NavLink {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  match: (pathname: string) => boolean;
}

const LINKS: NavLink[] = [
  { href: "/app", label: "Home", Icon: Home, match: (p) => p === "/app" },
  {
    href: "/app/transactions",
    label: "Transactions",
    Icon: Mail,
    match: (p) => p.startsWith("/app/transactions"),
  },
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
    href: "/app/inbox",
    label: "Inbox",
    Icon: Mail,
    match: (p) => p.startsWith("/app/inbox"),
  },
  {
    href: "/app/settings",
    label: "Settings",
    Icon: Settings,
    match: (p) => p.startsWith("/app/settings"),
  },
];

interface SidebarNavProps {
  fullName: string;
  email: string;
}

export function SidebarNav({ fullName, email }: SidebarNavProps) {
  const pathname = usePathname() ?? "/app";
  const router = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <LemonLogo className="h-7 w-7 text-neutral-900" />
        <span className="text-base font-semibold tracking-tight text-neutral-900">
          Lemonpay
        </span>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-0.5">
          {LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                    (active
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-200/60")
                  }
                >
                  <link.Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User identity */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 border-t border-neutral-200 px-4 py-3 text-left transition-colors hover:bg-neutral-200/60 focus:outline-none">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white">
            {initials(fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-900">
              {fullName || "Lemonpay user"}
            </p>
            <p className="truncate text-xs text-neutral-500">{email}</p>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          className="w-56 border-neutral-200 bg-white text-neutral-900"
        >
          <DropdownMenuLabel className="text-xs text-neutral-500">
            Signed in as
          </DropdownMenuLabel>
          <DropdownMenuItem disabled className="opacity-100">
            <div className="flex flex-col">
              <span className="text-sm">{fullName || "Lemonpay user"}</span>
              <span className="truncate text-xs text-neutral-500">{email}</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-neutral-200" />
          <DropdownMenuItem onSelect={() => router.push("/app/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}
