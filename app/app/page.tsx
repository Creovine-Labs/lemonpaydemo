"use client";

import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/lib/firebase-client";
import { useAuth } from "@/lib/use-auth";
import { COLLECTIONS, type User as LemonUser } from "@/lib/types";

/**
 * Phase 1 placeholder. Shows the signed-in user's UID + Firestore profile so
 * we can confirm auth UID and seed doc ID match. Phase 2 replaces this with
 * the real wallet/home screen.
 */
export default function AppHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<LemonUser | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, COLLECTIONS.users, user.uid);
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setProfileError("No Firestore profile for this UID.");
          return;
        }
        setProfile(snap.data() as LemonUser);
        setProfileError(null);
      },
      (err) => setProfileError(err.message),
    );
  }, [user]);

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-md space-y-8">
        <header>
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            Lemonpay · Phase 1
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {profile?.full_name ?? "Welcome"}
          </h1>
        </header>

        <section className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="mb-3 text-sm font-medium text-neutral-300">
            Auth ↔ Firestore handshake
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Auth UID" value={user.uid} mono />
            <Row label="Auth email" value={user.email ?? "—"} />
            <Row
              label="Firestore name"
              value={profile?.full_name ?? (profileError ? "(error)" : "loading…")}
            />
            <Row
              label="Firestore status"
              value={profile?.status ?? (profileError ? "(error)" : "loading…")}
            />
            <Row
              label="Firestore plan"
              value={profile?.plan ?? (profileError ? "(error)" : "loading…")}
            />
          </dl>
          {profileError && (
            <p className="mt-3 text-xs text-red-400">{profileError}</p>
          )}
        </section>

        <Button
          onClick={handleSignOut}
          variant="outline"
          className="h-10 border-neutral-700 bg-transparent text-neutral-100 hover:bg-neutral-900 hover:text-neutral-50"
        >
          Sign out
        </Button>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-neutral-500">{label}</dt>
      <dd
        className={
          "truncate text-neutral-100 " + (mono ? "font-mono text-xs" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}
