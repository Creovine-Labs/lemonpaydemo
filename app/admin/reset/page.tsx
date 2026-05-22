"use client";

import { CheckCircle2, Loader2, RotateCcw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LemonLogo } from "@/components/LemonLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ResetReport {
  reset_at: string;
  scope: "all";
  duration_ms: number;
  wiped: Record<string, number>;
  customers: { handle: string; email: string }[];
  transactions_seeded: number;
}

/**
 * Salesperson reset page. Not behind /app — accessible without a Firebase
 * sign-in. Gated only by the DEMO_RESET_TOKEN you paste here. Hit before
 * each demo run to restore Lola/Marcus/Priya/Diego/Sarah to their
 * baseline state.
 */
export default function ResetPage() {
  const [token, setToken] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ResetReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doReset() {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/admin/demo-reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scope: "all" }),
      });
      const payload = (await res.json()) as
        | { ok: true; data: ResetReport }
        | { ok: false; error: { code: string; message: string } };
      if (!res.ok || !payload.ok) {
        setError(
          payload.ok ? `HTTP ${res.status}` : payload.error.message,
        );
      } else {
        setReport(payload.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 px-6 py-16">
      <div className="w-full max-w-xl space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900"
        >
          <LemonLogo className="h-6 w-6 text-neutral-900" />
          <span className="text-sm font-medium tracking-tight">Lemonpay · Admin</span>
        </Link>

        <header>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-500">
            Internal
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Demo reset
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Wipes all customer data and re-seeds Lola, Marcus, Priya, Diego, and
            Sarah to their demo baseline. Safe to run as many times as you want.
          </p>
        </header>

        {/* Warning card */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" />
          <p>
            This is destructive. Every transaction, refund, dispute, KYC
            attempt, and limit request you created during testing will be
            deleted. The five seed customers will be re-created at their
            scripted baseline.
          </p>
        </div>

        {/* Token + action */}
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="token" className="text-sm font-medium text-neutral-800">
              Demo reset token
            </label>
            <Input
              id="token"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="DEMO_RESET_TOKEN"
              className="h-11 border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
              disabled={busy}
            />
            <p className="text-xs text-neutral-500">
              Set as <code className="text-neutral-700">DEMO_RESET_TOKEN</code>{" "}
              in the Firebase App Hosting environment. Ask the engineer for the
              current value.
            </p>
          </div>

          {confirming ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={doReset}
                disabled={busy || !token.trim()}
                className="h-11 flex-1 bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Yes, wipe and re-seed
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="h-11 text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setConfirming(true)}
              disabled={!token.trim()}
              className="h-11 w-full bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset demo data
            </Button>
          )}

          {error && (
            <p className="text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}
        </section>

        {/* Report */}
        {report && (
          <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="text-base font-semibold">
                Reset complete in {(report.duration_ms / 1000).toFixed(1)}s
              </h2>
            </div>

            <div className="text-sm text-neutral-700">
              <p className="font-medium">Cleared:</p>
              <ul className="ml-4 list-disc text-neutral-600">
                {Object.entries(report.wiped).map(([col, n]) => (
                  <li key={col}>
                    <span className="font-mono text-xs">{col}</span> · {n} docs
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-sm text-neutral-700">
              <p className="font-medium">Re-seeded customers:</p>
              <ul className="ml-4 list-disc text-neutral-600">
                {report.customers.map((c) => (
                  <li key={c.handle}>
                    <span className="font-medium text-neutral-900">{c.handle}</span>{" "}
                    · <span className="font-mono text-xs">{c.email}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-sm text-neutral-700">
              Transactions seeded: <span className="font-medium">{report.transactions_seeded}</span>
            </p>

            <p className="text-xs text-neutral-500">
              Password for every seeded account:{" "}
              <code className="text-neutral-700">lemon123</code>
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
