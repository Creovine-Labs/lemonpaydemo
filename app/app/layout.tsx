"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { BottomTabs } from "@/components/BottomTabs";
import { LiraProvider } from "@/components/LiraProvider";
import { MobileHeader } from "@/components/MobileHeader";
import { SidebarNav } from "@/components/SidebarNav";
import { useUserDoc } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

/**
 * Authenticated app shell. Desktop gets a left sidebar; mobile collapses to
 * a top header + bottom tab bar. Gates on Firebase Auth state and on the
 * user's KYC status — accounts not yet active get bounced to /signup/pending.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useUserDoc(user?.uid);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const status = profile.data?.status;
    if (status && status !== "active") {
      router.replace("/signup/pending");
    }
  }, [profile.data?.status, router]);

  if (loading || !user || profile.loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (profile.data && profile.data.status !== "active") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-neutral-500">Redirecting…</p>
      </div>
    );
  }

  const fullName = profile.data?.full_name ?? "";
  const email = user.email ?? "";

  return (
    <div className="flex h-screen flex-1 bg-white">
      <SidebarNav fullName={fullName} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader fullName={fullName} email={email} />
        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <BottomTabs />
      </div>
      <LiraProvider />
    </div>
  );
}
