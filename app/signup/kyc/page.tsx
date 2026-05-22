"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { KycStepper } from "@/components/KycStepper";
import { LemonLogo } from "@/components/LemonLogo";
import { useUserDoc } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";
import { toDate } from "@/lib/format";

export default function KycPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useUserDoc(user?.uid);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user || profile.loading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-neutral-50 px-6 py-16">
        <p className="text-sm text-neutral-500">Loading…</p>
      </main>
    );
  }

  // Already active → bounce to /app, no KYC needed.
  if (profile.data?.status === "active") {
    router.replace("/app");
    return null;
  }

  const dob = toDate(profile.data?.date_of_birth);
  const initial = {
    fullName: profile.data?.full_name ?? "",
    dateOfBirth: dob ? dob.toISOString().slice(0, 10) : "",
    nationalId: profile.data?.national_id ?? "",
    phone: profile.data?.phone_e164 ?? "",
    addressLine1: profile.data?.address?.line1 ?? "",
    city: profile.data?.address?.city ?? "Kigali",
    district: profile.data?.address?.district ?? "",
  };

  return (
    <main className="flex flex-1 justify-center bg-neutral-50 px-6 py-12">
      <div className="w-full max-w-xl space-y-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900"
        >
          <LemonLogo className="h-6 w-6 text-neutral-900" />
          <span className="text-sm font-medium tracking-tight">Lemonpay</span>
        </Link>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-500">
            Verify your identity
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Almost there.
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Rwandan regulators require us to verify your ID before activating
            your account.
          </p>
        </div>

        {profile.data?.status === "kyc_failed" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Your last attempt didn&apos;t go through.</p>
            <p className="mt-1 text-amber-800">
              Take another photo with the date of birth clearly visible — no
              glare or fingers covering it.
            </p>
          </div>
        )}

        <KycStepper uid={user.uid} initial={initial} />
      </div>
    </main>
  );
}
