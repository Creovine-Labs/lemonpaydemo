"use client";

import { CheckCircle2, Copy, Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api-client";
import { formatRwf } from "@/lib/format";

interface ElectricityData {
  tx_id: string;
  meter_number: string;
  amount_rwf: number;
  token: string;
  units_kwh: number;
}

const QUICK_AMOUNTS = [5_000, 10_000, 20_000, 50_000];

interface ElectricityFormProps {
  balanceRwf: number | null;
}

export function ElectricityForm({ balanceRwf }: ElectricityFormProps) {
  const [meter, setMeter] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ElectricityData | null>(null);

  const numericAmount = Number(amount.replace(/[^0-9]/g, ""));
  const hasFunds = balanceRwf === null || numericAmount <= balanceRwf;
  const canSubmit =
    /^\d{8,16}$/.test(meter.trim()) && numericAmount > 0 && hasFunds && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await apiPost<ElectricityData>("/api/services/electricity", {
      body: { meter_number: meter.trim(), amount_rwf: numericAmount },
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setReceipt(res.data);
    setAmount("");
  }

  async function copyToken() {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(receipt.token.replace(/-/g, ""));
      toast.success("Token copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6"
      >
        <div className="flex items-center gap-2 text-neutral-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white">
            <Zap className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold">Buy cash power</h2>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="meter" className="text-sm font-medium text-neutral-800">
            EUCL meter number
          </label>
          <Input
            id="meter"
            inputMode="numeric"
            value={meter}
            onChange={(e) => setMeter(e.target.value.replace(/\D/g, ""))}
            placeholder="12345678"
            maxLength={16}
            className="h-11 border-neutral-300 bg-white font-mono text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="ec_amount" className="text-sm font-medium text-neutral-800">
            Amount (RWF)
          </label>
          <Input
            id="ec_amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10000"
            className="h-11 border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {formatRwf(v)}
              </button>
            ))}
          </div>
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
              Processing…
            </>
          ) : (
            `Pay ${numericAmount > 0 ? formatRwf(numericAmount) : ""}`
          )}
        </Button>
      </form>

      {receipt && (
        <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="text-base font-semibold">Cash-power token</h3>
          </div>
          <div className="text-sm text-neutral-700">
            <p className="font-medium">Meter: <span className="font-mono">{receipt.meter_number}</span></p>
            <p>Amount: {formatRwf(receipt.amount_rwf)}</p>
            <p>Units: {receipt.units_kwh} kWh</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
              Token
            </p>
            <button
              type="button"
              onClick={copyToken}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:bg-neutral-50"
            >
              <span className="font-mono text-base tracking-[0.15em] text-neutral-900">
                {receipt.token}
              </span>
              <Copy className="h-4 w-4 text-neutral-500" />
            </button>
            <p className="text-xs text-neutral-500">
              Tap to copy. Punch this token into your meter to load the units.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
