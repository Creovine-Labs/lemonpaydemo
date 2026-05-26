"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUserDoc } from "@/lib/hooks";
import { setupLiraIdentity } from "@/lib/lira-client";
import { useAuth } from "@/lib/use-auth";

const MOUNT_SELECTOR = "#lira-support-root";

/**
 * Fullscreen Lira embed for /app/help. Calls the shared bootstrap (load +
 * init + identify + setContext) and then mountSupportPage. LiraProvider
 * does the same bootstrap at the layout level, so by the time this runs
 * the singleton is usually already initialized — the calls are idempotent.
 */
export function LiraWidget({ height = 720 }: { height?: number }) {
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const { user } = useAuth();
  const profile = useUserDoc(user?.uid);

  useEffect(() => {
    if (!user || !profile.data) return;
    const profileData = profile.data;
    let cancelled = false;

    (async () => {
      try {
        const sdk = await setupLiraIdentity({ user, profile: profileData, pathname });
        if (cancelled) return;
        await sdk.mountSupportPage(MOUNT_SELECTOR);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Lira widget failed to mount");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, profile.data, pathname]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Couldn't load support chat: {error}
      </div>
    );
  }

  return (
    <div
      id="lira-support-root"
      style={{ height: `${height}px` }}
      className="w-full overflow-hidden rounded-lg border border-neutral-200 bg-white"
    />
  );
}
