"use client";

import { ArrowUpRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { db } from "@/lib/firebase-client";
import { formatRwf } from "@/lib/format";
import { COLLECTIONS, type LimitRequest, type LimitType, type WithId } from "@/lib/types";

interface LimitDef {
  type: LimitType;
  label: string;
  current_rwf: number;
}

// Default limits — in a real app these'd come from a `limits` Firestore doc.
const DEFAULT_LIMITS: LimitDef[] = [
  { type: "daily_spend", label: "Daily spend", current_rwf: 500_000 },
  { type: "monthly_spend", label: "Monthly spend", current_rwf: 5_000_000 },
  { type: "single_transaction", label: "Single transaction", current_rwf: 250_000 },
];

interface LimitsPanelProps {
  uid: string;
  pendingRequests: WithId<LimitRequest>[];
}

export function LimitsPanel({ uid, pendingRequests }: LimitsPanelProps) {
  const [picked, setPicked] = useState<LimitDef | null>(null);
  const [requested, setRequested] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function open(def: LimitDef) {
    setPicked(def);
    setRequested(String(def.current_rwf * 4));
  }

  async function submitRequest() {
    if (!picked) return;
    const num = Number(requested.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(num) || num <= picked.current_rwf) {
      toast.error("Requested limit must be higher than the current one");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, COLLECTIONS.limit_requests), {
        user_id: uid,
        type: picked.type,
        current_limit_rwf: picked.current_rwf,
        requested_limit_rwf: num,
        status: "pending",
        decision_reason: null,
        created_at: serverTimestamp(),
      });
      toast.success("Limit increase requested");
      setPicked(null);
      setRequested("");
    } catch (err) {
      toast.error(
        `Couldn't submit: ${err instanceof Error ? err.message : "unknown"}`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        {DEFAULT_LIMITS.map((def) => {
          const pending = pendingRequests.find(
            (r) => r.type === def.type && r.status === "pending",
          );
          return (
            <div
              key={def.type}
              className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{def.label}</p>
                <p className="text-sm tabular-nums text-neutral-700">
                  {formatRwf(def.current_rwf)}
                </p>
                {pending && (
                  <p className="mt-1 text-xs text-amber-700">
                    Pending review: {formatRwf(pending.requested_limit_rwf)}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                className="h-9 border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                disabled={!!pending}
                onClick={() => open(def)}
              >
                <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                {pending ? "Requested" : "Request increase"}
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={picked !== null} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent className="border-neutral-200 bg-white text-neutral-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a higher {picked?.label.toLowerCase()} limit</DialogTitle>
            <DialogDescription className="text-neutral-600">
              Current limit: {picked ? formatRwf(picked.current_rwf) : ""}. Tell
              us the new limit you need — most requests are reviewed within an
              hour.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="newLimit" className="text-sm font-medium text-neutral-800">
              New limit (RWF)
            </label>
            <Input
              id="newLimit"
              value={requested}
              onChange={(e) => setRequested(e.target.value)}
              inputMode="numeric"
              className="h-11 border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setPicked(null)}
              disabled={submitting}
              className="text-neutral-700 hover:bg-neutral-100"
            >
              Cancel
            </Button>
            <Button
              onClick={submitRequest}
              disabled={submitting}
              className="h-10 bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
