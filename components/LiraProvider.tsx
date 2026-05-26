"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { apiPost } from "@/lib/api-client";
import { useUserDoc } from "@/lib/hooks";
import {
  type LiraActionResult,
  type LiraSDK,
  setupLiraIdentity,
} from "@/lib/lira-client";
import { useAuth } from "@/lib/use-auth";

/**
 * Boots Lira once for the authenticated app shell:
 *   - loads widget.js (which auto-mounts the floating launcher)
 *   - signs identity via /api/lira/identity and calls Lira.identify
 *   - pushes initial setContext, refreshes it on every route change
 *   - registers demo AI actions (top up, navigate)
 *
 * The /app/help page additionally mounts a fullscreen embed via LiraWidget;
 * because init/identify/setContext are idempotent on the shared
 * window.Lira singleton, calling them from both is safe.
 */
export function LiraProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const profile = useUserDoc(user?.uid);
  const sdkRef = useRef<LiraSDK | null>(null);
  const actionsRegisteredRef = useRef(false);

  useEffect(() => {
    if (!user || !profile.data) return;
    const profileData = profile.data;
    let cancelled = false;

    (async () => {
      try {
        const sdk = await setupLiraIdentity({ user, profile: profileData, pathname });
        if (cancelled) return;
        sdkRef.current = sdk;

        if (!actionsRegisteredRef.current && typeof sdk.registerAction === "function") {
          actionsRegisteredRef.current = true;

          sdk.registerAction(
            "navigate.goto",
            async ({ payload }): Promise<LiraActionResult> => {
              const path = typeof payload.path === "string" ? payload.path : null;
              if (!path) return { ok: false, message: "Missing payload.path" };
              router.push(path);
              return { ok: true, message: `Navigated to ${path}` };
            },
          );

          sdk.registerAction(
            "account.topup",
            async ({ payload }): Promise<LiraActionResult> => {
              const amount = Number(payload.amount_rwf);
              const source = String(payload.source ?? "bank_transfer");
              if (!Number.isFinite(amount) || amount <= 0) {
                return { ok: false, message: "Invalid amount_rwf" };
              }
              const res = await apiPost<{ tx_id: string; amount_rwf: number }>(
                "/api/deposits",
                { body: { amount_rwf: amount, source } },
              );
              if (!res.ok) return { ok: false, message: res.error.message };
              return {
                ok: true,
                message: `Top-up of RWF ${amount.toLocaleString()} from ${source} posted`,
                data: { tx_id: res.data.tx_id },
              };
            },
          );
        }
      } catch (err) {
        // Boot failure shouldn't crash the app shell — log and move on.
        console.error("Lira bootstrap failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, profile.data, pathname, router]);

  useEffect(() => {
    const sdk = sdkRef.current;
    if (!sdk || !user || !profile.data) return;
    void sdk.setContext({
      route: pathname,
      account: {
        uid: user.uid,
        status: profile.data.status,
        plan: profile.data.plan,
      },
    });
  }, [pathname, user, profile.data]);

  return null;
}
