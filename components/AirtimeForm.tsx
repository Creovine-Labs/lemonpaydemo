"use client";

import { Loader2, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api-client";
import { formatRwf } from "@/lib/format";

type Provider = "mtn" | "airtel";

interface AirtimeData {
  tx_id: string;
  phone: string;
  provider: Provider;
  amount_rwf: number;
}

const QUICK_AMOUNTS = [500, 1_000, 2_000, 5_000, 10_000];

const PROVIDERS: { value: Provider; label: string; sub: string }[] = [
  { value: "mtn", label: "MTN", sub: "07{8,9} numbers" },
  { value: "airtel", label: "Airtel", sub: "07{2,3} numbers" },
];

interface AirtimeFormProps {
  balanceRwf: number | null;
}

export function AirtimeForm({ balanceRwf }: AirtimeFormProps) {
  const [provider, setProvider] = useState<Provider>("mtn");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount.replace(/[^0-9]/g, ""));
  const hasFunds = balanceRwf === null || numericAmount <= balanceRwf;
  const canSubmit =
    /^\+?\d{10,15}$/.test(phone.trim()) &&
    numericAmount > 0 &&
    hasFunds &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await apiPost<AirtimeData>("/api/services/airtime", {
      body: {
        provider,
        phone_e164: phone.trim(),
        amount_rwf: numericAmount,
      },
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    toast.success(
      `${formatRwf(numericAmount)} airtime sent to ${res.data.phone}`,
    );
    setAmount("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6"
    >
      <div className="flex items-center gap-2 text-neutral-900">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white">
          <Smartphone className="h-4 w-4" />
        </span>
        <h2 className="text-base font-semibold">Buy airtime</h2>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-neutral-800">Provider</p>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDERS.map((p) => {
            const active = provider === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setProvider(p.value)}
                className={
                  "rounded-xl border px-4 py-3 text-left transition-colors " +
                  (active
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 bg-white hover:bg-neutral-50")
                }
              >
                <p className="text-sm font-semibold text-neutral-900">{p.label}</p>
                <p className="text-xs text-neutral-500">{p.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium text-neutral-800">
          Phone number
        </label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+250788000000"
          className="h-11 border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="at_amount" className="text-sm font-medium text-neutral-800">
          Amount (RWF)
        </label>
        <Input
          id="at_amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1000"
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
            Sending…
          </>
        ) : (
          `Buy ${numericAmount > 0 ? formatRwf(numericAmount) : ""} airtime`
        )}
      </Button>
    </form>
  );
}
