"use client";

import { signOut } from "firebase/auth";
import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { logoutLira } from "@/lib/lira-client";

interface MobileHeaderProps {
  fullName: string;
  email: string;
}

/**
 * Mobile-only top bar with the Lemonpay mark on the left and the user
 * dropdown on the right. Hidden on md+ where the sidebar takes over.
 */
export function MobileHeader({ fullName, email }: MobileHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    logoutLira();
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <LemonLogo className="h-6 w-6 text-neutral-900" />
        <span className="text-sm font-semibold tracking-tight">Lemonpay</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-neutral-300">
          {initials(fullName)}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
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
    </header>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}
