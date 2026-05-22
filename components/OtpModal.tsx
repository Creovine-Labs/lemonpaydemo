"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
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
import { apiPost } from "@/lib/api-client";

interface OtpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purpose: "refund_confirm" | "limit_change" | "login";
  /** Callback fired with a short-lived JWT after successful verify. */
  onVerified: (token: string) => void;
}

interface OtpSendData {
  otp_id: string;
  expires_in_seconds: number;
}
interface OtpVerifyData {
  verification_token: string;
  expires_in_seconds: number;
}

export function OtpModal({ open, onOpenChange, purpose, onVerified }: OtpModalProps) {
  const [otpId, setOtpId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Send a fresh code whenever the modal opens.
  useEffect(() => {
    if (!open) {
      setOtpId(null);
      setCode("");
      setErrorMsg(null);
      return;
    }
    void send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send() {
    setSending(true);
    setErrorMsg(null);
    const res = await apiPost<OtpSendData>("/api/otp/send", {
      body: { purpose },
    });
    setSending(false);
    if (!res.ok) {
      // For demo purposes, surface the underlying message — including
      // "sms_failed" so the salesperson knows AT is unreachable in sandbox.
      setErrorMsg(res.error.message);
      return;
    }
    setOtpId(res.data.otp_id);
    toast.info("OTP sent — check your phone (or the dev console)");
  }

  async function verify() {
    if (!otpId) return;
    if (!/^\d{6}$/.test(code)) {
      setErrorMsg("Enter the 6-digit code");
      return;
    }
    setVerifying(true);
    setErrorMsg(null);
    const res = await apiPost<OtpVerifyData>("/api/otp/verify", {
      body: { otp_id: otpId, code },
    });
    setVerifying(false);
    if (!res.ok) {
      setErrorMsg(res.error.message);
      return;
    }
    onVerified(res.data.verification_token);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-200 bg-white text-neutral-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Verify with a code
          </DialogTitle>
          <DialogDescription className="text-neutral-600">
            We sent a 6-digit code to your phone. Enter it below to confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="otpCode" className="text-sm font-medium text-neutral-800">
            6-digit code
          </label>
          <Input
            id="otpCode"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="h-12 border-neutral-300 bg-white text-center font-mono text-lg tracking-[0.4em] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
            disabled={!otpId || verifying}
          />
          {sending && (
            <p className="flex items-center gap-1.5 text-xs text-neutral-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sending code…
            </p>
          )}
          {errorMsg && (
            <p className="text-xs text-rose-600" role="alert">
              {errorMsg}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => void send()}
            disabled={sending || verifying}
            className="text-neutral-700 hover:bg-neutral-100"
          >
            Resend
          </Button>
          <Button
            onClick={verify}
            disabled={!otpId || verifying || code.length !== 6}
            className="h-10 bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {verifying ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
