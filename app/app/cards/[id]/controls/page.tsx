"use client";

import { Loader2, Plus, X } from "lucide-react";
import { use, useState } from "react";
import { toast } from "sonner";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase-client";
import { useCard, useMerchantLocks } from "@/lib/hooks";
import { useAuth } from "@/lib/use-auth";
import {
  COLLECTIONS,
  type MerchantLock,
  type WithId,
} from "@/lib/types";

const CATEGORIES = [
  "Groceries",
  "Restaurants",
  "Fuel",
  "Online shopping",
  "Gambling",
  "Cash advances",
  "Travel",
  "Subscriptions",
];

export default function CardControlsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const card = useCard(id);
  const locks = useMerchantLocks(user?.uid);

  if (!user) return null;

  const isOwned = !card.data || card.data.user_id === user.uid;

  return (
    <div className="space-y-8">
      <PageHeader
        subtitle="Card"
        title="Controls"
        back={`/app/cards/${id}`}
      />

      {card.loading ? (
        <Skeleton className="h-40 w-full rounded-2xl bg-neutral-100" />
      ) : !card.data || !isOwned ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-16 text-center text-sm text-neutral-500">
          Card not found.
        </p>
      ) : (
        <div className="mx-auto max-w-2xl space-y-8">
          <CategorySection uid={user.uid} locks={locks.data} />
          <MerchantAllowList uid={user.uid} locks={locks.data} />
          <GeoLocksPlaceholder />
        </div>
      )}
    </div>
  );
}

function CategorySection({
  uid,
  locks,
}: {
  uid: string;
  locks: WithId<MerchantLock>[];
}) {
  const blockedSet = new Set(
    locks
      .filter((l) => l.scope === "category" && l.action === "block")
      .map((l) => l.target),
  );

  async function setBlocked(category: string, blocked: boolean) {
    try {
      if (blocked) {
        await addDoc(collection(db, COLLECTIONS.merchant_locks), {
          user_id: uid,
          scope: "category",
          target: category,
          action: "block",
          created_at: serverTimestamp(),
        });
      } else {
        const existing = locks.find(
          (l) =>
            l.scope === "category" &&
            l.target === category &&
            l.action === "block",
        );
        if (existing) await deleteDoc(doc(db, COLLECTIONS.merchant_locks, existing.id));
      }
    } catch (err) {
      toast.error(
        `Couldn't update: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h2 className="text-base font-semibold text-neutral-900">
        Merchant categories
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        Block whole categories of merchants. Toggle off to allow them again.
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const blocked = blockedSet.has(cat);
          return (
            <li key={cat}>
              <button
                type="button"
                onClick={() => setBlocked(cat, !blocked)}
                className={
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors " +
                  (blocked
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50")
                }
              >
                <span className="text-sm font-medium">{cat}</span>
                <span
                  className={
                    "text-[10px] font-medium uppercase tracking-widest " +
                    (blocked ? "text-neutral-300" : "text-neutral-500")
                  }
                >
                  {blocked ? "Blocked" : "Allowed"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MerchantAllowList({
  uid,
  locks,
}: {
  uid: string;
  locks: WithId<MerchantLock>[];
}) {
  const allowed = locks.filter(
    (l) => l.scope === "merchant" && l.action === "allow",
  );
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function addAllow() {
    const target = draft.trim().toLowerCase();
    if (!target) return;
    if (allowed.some((l) => l.target === target)) {
      toast.info("Already on the allow-list");
      return;
    }
    setBusy(true);
    try {
      await addDoc(collection(db, COLLECTIONS.merchant_locks), {
        user_id: uid,
        scope: "merchant",
        target,
        action: "allow",
        created_at: serverTimestamp(),
      });
      setDraft("");
      toast.success(`${target} added to allow-list`);
    } catch (err) {
      toast.error(
        `Couldn't add: ${err instanceof Error ? err.message : "unknown"}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(lockId: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.merchant_locks, lockId));
    } catch (err) {
      toast.error(
        `Couldn't remove: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h2 className="text-base font-semibold text-neutral-900">
        Merchant allow-list
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        Specific merchants that bypass the category blocks above. Add a
        merchant id like <code className="text-xs text-neutral-700">simba_supermarket</code>.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="merchant_id"
          className="h-10 border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addAllow();
            }
          }}
        />
        <Button
          onClick={addAllow}
          disabled={busy || !draft.trim()}
          className="h-10 bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {allowed.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-neutral-200 px-4 py-6 text-center text-xs text-neutral-500">
          Nothing on the allow-list yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {allowed.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => remove(l.id)}
                className="group flex items-center gap-1.5 rounded-full border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
              >
                <span className="font-mono">{l.target}</span>
                <X className="h-3 w-3 text-neutral-500 group-hover:text-neutral-800" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GeoLocksPlaceholder() {
  return (
    <section className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-6">
      <h2 className="text-base font-semibold text-neutral-900">
        Geographic locks
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        Rwanda is allowed by default. Other African countries and international
        transactions need to be explicitly enabled. Wires up in a later pass.
      </p>
    </section>
  );
}
