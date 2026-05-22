"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { OtpModal } from "@/components/OtpModal";
import { apiPost } from "@/lib/api-client";
import { formatRwf } from "@/lib/format";
import type { Transaction, WithId } from "@/lib/types";

interface RefundFlowProps {
  tx: WithId<Transaction>;
}

interface RefundData {
  refund_id: string;
  status: string;
  expected_in_account: string;
}

const REASONS: { value: "duplicate" | "fraud" | "customer_request"; label: string }[] = [
  { value: "duplicate", label: "Duplicate charge" },
  { value: "fraud", label: "Unauthorized / fraudulent" },
  { value: "customer_request", label: "Other (customer request)" },
];

export function RefundFlow({ tx }: RefundFlowProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(tx.amount_rwf));
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("duplicate");
  const [submitting, setSubmitting] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);

  // Refund eligibility: only "posted" purchases. Refunds, transfers, disputed/
  // declined/refunded transactions are not eligible.
  const eligible = tx.status === "posted" && tx.type === "purchase";

  async function tryRefund(otpToken?: string) {
    const numericAmount = Number(amount.replace(/[^0-9]/g, ""));
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    if (numericAmount > tx.amount_rwf) {
      toast.error("Refund cannot exceed the original charge");
      return;
    }
    setSubmitting(true);
    const res = await apiPost<RefundData>("/api/refunds", {
      headers: {
        "Idempotency-Key": `refund_${tx.id}_${reason}_${numericAmount}`,
        ...(otpToken ? { "X-OTP-Token": otpToken } : {}),
      },
      body: {
        transaction_id: tx.id,
        amount_rwf: numericAmount,
        reason,
      },
    });
    setSubmitting(false);

    if (res.ok) {
      toast.success(
        `Refund processed — ${formatRwf(numericAmount)} back in ${res.data.expected_in_account}`,
      );
      setOpen(false);
      return;
    }

    if (res.error.code === "step_up_required") {
      // Open the OTP modal; tryRefund will be called again with the token.
      setOtpOpen(true);
      return;
    }

    toast.error(res.error.message);
  }

  if (!eligible) return null;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-10 border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Request refund
      </Button>

      <Dialog open={open} onOpenChange={(o) => !submitting && setOpen(o)}>
        <DialogContent className="border-neutral-200 bg-white text-neutral-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refund {tx.merchant_name}</DialogTitle>
            <DialogDescription className="text-neutral-600">
              Original charge: {formatRwf(tx.amount_rwf)}. We&apos;ll credit the
              account immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="refundAmount" className="text-sm font-medium text-neutral-800">
                Refund amount (RWF)
              </label>
              <Input
                id="refundAmount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 border-neutral-300 bg-white text-neutral-900 focus:border-neutral-900 focus:ring-0"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="refundReason" className="text-sm font-medium text-neutral-800">
                Reason
              </label>
              <select
                id="refundReason"
                value={reason}
                onChange={(e) => setReason(e.target.value as typeof reason)}
                className="h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-neutral-500">
              Refunds over RWF 250,000 require step-up verification with a code
              sent to your phone.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="text-neutral-700 hover:bg-neutral-100"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void tryRefund()}
              disabled={submitting}
              className="h-10 bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                "Refund"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OtpModal
        open={otpOpen}
        onOpenChange={setOtpOpen}
        purpose="refund_confirm"
        onVerified={(token) => void tryRefund(token)}
      />
    </>
  );
}
