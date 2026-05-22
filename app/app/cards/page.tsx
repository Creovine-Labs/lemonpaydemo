"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { VirtualCard } from "@/components/VirtualCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useCards, useUserDoc } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";

export default function CardsPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const profile = useUserDoc(uid);
  const cards = useCards(uid);

  if (!user) return null;

  return (
    <div className="space-y-8">
      <PageHeader subtitle="Wallet" title="Cards" />

      {cards.loading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="aspect-[1.586/1] w-full rounded-2xl bg-neutral-100" />
        </div>
      ) : cards.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-16 text-center text-sm text-neutral-500">
          No cards yet.
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {cards.data.map((card) => (
            <li key={card.id}>
              <Link
                href={`/app/cards/${card.id}`}
                className="block transition-transform hover:scale-[1.01]"
              >
                <VirtualCard
                  card={card}
                  holderName={profile.data?.full_name ?? ""}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 px-4 py-4 text-sm text-neutral-500 disabled:opacity-60 sm:max-w-sm"
      >
        <Plus className="h-4 w-4" />
        Add a new card (coming soon)
      </button>
    </div>
  );
}
