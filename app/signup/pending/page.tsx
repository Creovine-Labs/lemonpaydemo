"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LemonLogo } from "@/components/LemonLogo";
import { Button } from "@/components/ui/button";
import { useUserDoc } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

export default function PendingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useUserDoc(user?.uid);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Live status flip → straight to the app.
  useEffect(() => {
    if (profile.data?.status === "active") {
      const t = setTimeout(() => router.replace("/app"), 1500);
      return () => clearTimeout(t);
    }
  }, [profile.data?.status, router]);

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-neutral-50 px-6 py-16">
        <p className="text-sm text-neutral-500">Loading…</p>
      </main>
    );
  }

  const status = profile.data?.status;

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 px-6 py-16">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900"
        >
          <LemonLogo className="h-6 w-6 text-neutral-900" />
          <span className="text-sm font-medium tracking-tight">Lemonpay</span>
        </Link>

        {status === "active" ? (
          <PassedBlock />
        ) : status === "kyc_failed" ? (
          <FailedBlock />
        ) : (
          <PendingBlock />
        )}
      </div>
    </main>
  );
}

function PendingBlock() {
  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-neutral-700" />
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          We&apos;re verifying your ID
        </h1>
      </div>
      <p className="text-sm text-neutral-600">
        Usually takes under a minute. This page will refresh automatically when
        the result is in.
      </p>
      <p className="text-xs text-neutral-500">
        Need help? Chat with us — the floating button on the bottom-right of
        the app is open 24/7.
      </p>
    </>
  );
}

function PassedBlock() {
  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          You&apos;re verified.
        </h1>
      </div>
      <p className="text-sm text-neutral-600">
        Taking you to your wallet…
      </p>
    </>
  );
}

function FailedBlock() {
  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <XCircle className="h-12 w-12 text-rose-600" />
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Verification didn&apos;t go through
        </h1>
      </div>
      <p className="text-sm text-neutral-600">
        Sometimes a re-shoot of the ID is all it takes. Try again with the date
        of birth clearly visible — no glare, nothing covering it.
      </p>
      <Button className="h-11 w-full bg-neutral-900 text-white hover:bg-neutral-800">
        <Link href="/signup/kyc">Try again</Link>
      </Button>
    </>
  );
}
