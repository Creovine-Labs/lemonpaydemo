"use client";

import {
  Bell,
  ChevronRight,
  Gauge,
  LifeBuoy,
  LogOut,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/firebase-client";
import { logoutLira } from "@/lib/lira-client";
import { useUserDoc } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

export default function SettingsHub() {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useUserDoc(user?.uid);

  async function handleSignOut() {
    logoutLira();
    await signOut(auth);
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <div className="space-y-8">
      <PageHeader subtitle="Account" title="Settings" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity card */}
        <section className="lg:col-span-1">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-lg font-medium text-white">
              {initial(profile.data?.full_name)}
            </div>
            <div className="mt-4">
              <p className="text-base font-semibold text-neutral-900">
                {profile.data?.full_name ?? "Lemonpay user"}
              </p>
              <p className="mt-0.5 text-sm text-neutral-500">{user.email}</p>
              {profile.data?.plan && (
                <Badge className="mt-3 border-0 bg-neutral-100 text-[10px] font-medium uppercase tracking-widest text-neutral-700 hover:bg-neutral-100">
                  {profile.data.plan} plan
                </Badge>
              )}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </section>

        {/* Menu */}
        <nav className="space-y-2 lg:col-span-2">
          <SettingsLink
            Icon={Gauge}
            href="/app/settings/limits"
            label="Limits"
            hint="Daily and monthly caps"
          />
          <SettingsLink
            Icon={UserCheck}
            href="/app/settings/kyc"
            label="Identity"
            hint={`Status: ${profile.data?.status ?? "—"}`}
          />
          <SettingsLink
            Icon={ShieldCheck}
            href="/app/settings/security"
            label="Security"
            hint="Password, MFA, sessions"
          />
          <SettingsLink
            Icon={Bell}
            href="/app/settings/notifications"
            label="Notifications"
            hint="Push, SMS, email"
          />
          <SettingsLink
            Icon={LifeBuoy}
            href="/app/help"
            label="Help"
            hint="Chat with Lira"
          />
        </nav>
      </div>
    </div>
  );
}

function SettingsLink({
  Icon,
  href,
  label,
  hint,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4 transition-colors hover:bg-neutral-50"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-neutral-900">{label}</p>
          <p className="text-xs text-neutral-500">{hint}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-neutral-400" />
    </Link>
  );
}

function initial(name?: string): string {
  if (!name) return "?";
  return name.trim()[0]?.toUpperCase() ?? "?";
}
