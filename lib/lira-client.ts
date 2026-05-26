"use client";

import type { User as FirebaseUser } from "firebase/auth";
import { apiPost } from "./api-client";
import type { User } from "./types";

/**
 * Shared client-side bootstrap for the Lira support widget.
 *
 * Two surfaces consume this:
 *   - components/LiraProvider.tsx — mounted in the app layout, runs init +
 *     identify + setContext and registers AI actions. Gives the floating
 *     launcher on every authenticated page.
 *   - components/LiraWidget.tsx — mounted on /app/help, also calls
 *     mountSupportPage to render the fullscreen embed.
 *
 * Both share the same `window.Lira` singleton; init/identify/setContext are
 * idempotent so calling them from both surfaces is safe.
 */

export const LIRA_WIDGET_SRC = "https://widget.liraintelligence.com/v1/widget.js";
export const LIRA_ORG_ID = process.env.NEXT_PUBLIC_LIRA_ORG_ID;
export const LIRA_ORG_NAME = "Lemonpay";
export const LIRA_GREETING = "Hi! How can we help you now?";

export interface LiraIdentity {
  email: string;
  name: string;
  sig: string;
}

export interface LiraActionResult {
  ok: boolean;
  message?: string;
  data?: unknown;
}

export interface LiraSDK {
  init: (opts: { orgId: string; orgName?: string; greeting?: string }) => Promise<void> | void;
  identify: (id: LiraIdentity) => Promise<void> | void;
  setContext: (ctx: Record<string, unknown>) => Promise<void> | void;
  mountSupportPage: (selector: string) => Promise<void> | void;
  registerAction?: (
    name: string,
    handler: (args: { payload: Record<string, unknown> }) => Promise<LiraActionResult> | LiraActionResult,
  ) => void;
}

declare global {
  interface Window {
    Lira?: LiraSDK;
  }
}

/**
 * Insert the widget script once. Uses data-attrs so the floating launcher
 * auto-inits (data-position) — the JS SDK calls below refine the config.
 * Resolves when window.Lira is available; rejects if the script fails.
 */
export function loadLiraScript(): Promise<LiraSDK> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Lira script must be loaded in the browser"));
      return;
    }
    if (window.Lira) {
      resolve(window.Lira);
      return;
    }
    if (!LIRA_ORG_ID) {
      reject(new Error("NEXT_PUBLIC_LIRA_ORG_ID is not set"));
      return;
    }

    const finish = () => {
      if (window.Lira) resolve(window.Lira);
      else reject(new Error("widget.js loaded but window.Lira is missing"));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${LIRA_WIDGET_SRC}"]`,
    );
    if (existing) {
      if (window.Lira) {
        resolve(window.Lira);
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("widget.js failed to load")),
        { once: true },
      );
      return;
    }

    const s = document.createElement("script");
    s.src = LIRA_WIDGET_SRC;
    s.async = true;
    s.dataset.orgId = LIRA_ORG_ID;
    s.dataset.greeting = LIRA_GREETING;
    s.dataset.position = "bottom-right";
    s.onload = finish;
    s.onerror = () => reject(new Error("widget.js failed to load"));
    document.body.appendChild(s);
  });
}

export interface SetupOpts {
  user: FirebaseUser;
  profile: User;
  pathname: string;
}

/**
 * One-shot bootstrap: load the script, init the SDK, fetch a server-signed
 * identity, identify the session, and push initial context. Returns the
 * ready SDK so callers can do further work (mountSupportPage, registerAction).
 */
export async function setupLiraIdentity({
  user,
  profile,
  pathname,
}: SetupOpts): Promise<LiraSDK> {
  if (!LIRA_ORG_ID) throw new Error("NEXT_PUBLIC_LIRA_ORG_ID is not set");

  const sdk = await loadLiraScript();

  const idRes = await apiPost<LiraIdentity>("/api/lira/identity");
  if (!idRes.ok) throw new Error(idRes.error.message);

  await sdk.init({
    orgId: LIRA_ORG_ID,
    orgName: LIRA_ORG_NAME,
    greeting: LIRA_GREETING,
  });
  await sdk.identify(idRes.data);
  await sdk.setContext({
    route: pathname,
    account: {
      uid: user.uid,
      status: profile.status,
      plan: profile.plan,
    },
  });

  return sdk;
}
