"use client";

import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { useUserDoc } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

export default function KycSettingsPage() {
  const { user } = useAuth();
  const profile = useUserDoc(user?.uid);

  if (!user) return null;

  return (
    <div className="space-y-8">
      <PageHeader subtitle="Settings" title="Identity" back="/app/settings" />

      <div className="mx-auto max-w-2xl space-y-4">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Verification status
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Your identity has been verified and your account is active.
              </p>
            </div>
            <Badge className="border-0 bg-emerald-50 text-[10px] font-medium uppercase tracking-widest text-emerald-700 hover:bg-emerald-50">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Verified
            </Badge>
          </div>

          <dl className="mt-5 space-y-2 text-sm">
            <Row label="Full name" value={profile.data?.full_name ?? "—"} />
            <Row label="National ID" value={profile.data?.national_id || "—"} mono />
            <Row label="Phone" value={profile.data?.phone_e164 ?? "—"} />
            <Row
              label="Address"
              value={
                profile.data?.address?.line1
                  ? `${profile.data.address.line1}, ${profile.data.address.city}`
                  : "—"
              }
            />
          </dl>
        </section>

        <p className="text-xs text-neutral-500">
          To re-verify your identity (e.g. updated ID), contact support — the
          Lira widget at the bottom-right is the fastest way.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd
        className={
          "text-right text-neutral-800 " + (mono ? "font-mono text-xs" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}
