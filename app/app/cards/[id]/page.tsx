"use client";

import { ChevronRight, RefreshCw, Snowflake } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { PageHeader } from "@/components/PageHeader";
import { VirtualCard } from "@/components/VirtualCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useCard, useUserDoc } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

export default function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const profile = useUserDoc(user?.uid);
  const card = useCard(id);

  if (!user) return null;

  const isOwned = !card.data || card.data.user_id === user.uid;

  return (
    <div className="space-y-8">
      <PageHeader
        subtitle="Card"
        title={card.data ? `•••• ${card.data.last4}` : "Detail"}
        back="/app/cards"
      />

      {card.loading ? (
        <Skeleton className="aspect-[1.586/1] w-full rounded-2xl bg-neutral-100" />
      ) : !card.data || !isOwned ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-16 text-center text-sm text-neutral-500">
          {card.error ?? "Card not found."}
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <VirtualCard
              card={card.data}
              holderName={profile.data?.full_name ?? ""}
            />
          </div>

          <div className="space-y-2">
            <ControlRow
              Icon={Snowflake}
              label={
                card.data.status === "frozen" ? "Unfreeze card" : "Freeze card"
              }
              hint="Block new charges instantly"
              disabled
              disabledHint="Wires up in Phase 4"
            />
            <ControlRow
              Icon={RefreshCw}
              label="Replace card"
              hint="Terminate this card and issue a new one"
              disabled
              disabledHint="Wires up in Phase 4"
            />
            <ControlLink
              href={`/app/cards/${card.data.user_id}/controls`}
              label="Card controls"
              hint="Merchant locks, geo locks, allow-list"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface ControlRowProps {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  hint: string;
  disabled?: boolean;
  disabledHint?: string;
}

function ControlRow({ Icon, label, hint, disabled, disabledHint }: ControlRowProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-neutral-900">{label}</p>
          <p className="text-xs text-neutral-500">
            {disabled && disabledHint ? disabledHint : hint}
          </p>
        </div>
      </div>
    </button>
  );
}

function ControlLink({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-colors hover:bg-neutral-50"
    >
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-500">{hint}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-neutral-400" />
    </Link>
  );
}
