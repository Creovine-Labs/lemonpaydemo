"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api-client";
import { formatRwf } from "@/lib/format";

interface TransferFormProps {
  /** Current sender balance (used for inline preview / validation). */
  balanceRwf: number | null;
}

interface TransferData {
  sender_tx_id: string;
  recipient_tx_id: string;
  amount_rwf: number;
  recipient_name: string;
}

export function TransferForm({ balanceRwf }: TransferFormProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount.replace(/[^0-9]/g, ""));
  const hasFunds = balanceRwf === null || numericAmount <= balanceRwf;
  const canSubmit =
    /.+@.+/.test(recipient) && numericAmount > 0 && hasFunds && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    const idempotencyKey = `transfer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const res = await apiPost<TransferData>("/api/transfers", {
      headers: { "Idempotency-Key": idempotencyKey },
      body: {
        recipient_email: recipient.trim().toLowerCase(),
        amount_rwf: numericAmount,
        note: note.trim() || undefined,
      },
    });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    toast.success(
      `${formatRwf(numericAmount)} sent to ${res.data.recipient_name}`,
    );
    setRecipient("");
    setAmount("");
    setNote("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="recipient" className="text-sm font-medium text-neutral-800">
          Recipient email
        </label>
        <Input
          id="recipient"
          type="email"
          autoComplete="off"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="priya@lemonpay.demo"
          className="h-11 border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
        />
        <p className="text-xs text-neutral-500">
          Other seeded demo accounts: <span className="font-mono">priya@lemonpay.demo</span>, <span className="font-mono">diego@lemonpay.demo</span>, <span className="font-mono">sarah@lemonpay.demo</span>
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="amount" className="text-sm font-medium text-neutral-800">
          Amount (RWF)
        </label>
        <Input
          id="amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10000"
          className="h-11 border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
        />
        {balanceRwf !== null && (
          <p
            className={
              "text-xs " + (hasFunds ? "text-neutral-500" : "text-rose-600")
            }
          >
            Available: {formatRwf(balanceRwf)}
            {!hasFunds && " — over your balance"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm font-medium text-neutral-800">
          Note <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <Input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Rent · split bill · …"
          maxLength={280}
          className="h-11 border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
        />
      </div>

      {error && (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={!canSubmit}
        className="h-11 w-full bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send className="mr-1.5 h-4 w-4" />
            Send {numericAmount > 0 ? formatRwf(numericAmount) : "money"}
          </>
        )}
      </Button>
    </form>
  );
}
