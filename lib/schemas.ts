import { z } from "zod";

/**
 * Zod schemas for every /api/* endpoint body (spec §7). Each endpoint route
 * validates its body against the corresponding schema before doing any work.
 */

// Shared helpers
const idempotencyKey = z.string().min(8).max(128);
const rwfAmount = z.number().int().positive();

// ---------- /api/cards/[id]/freeze ----------
export const freezeCardBody = z.object({
  reason: z.enum(["lost", "stolen", "fraud", "user_request"]),
});
export type FreezeCardBody = z.infer<typeof freezeCardBody>;

// ---------- /api/cards/[id]/unfreeze ----------
export const unfreezeCardBody = z.object({}).default({});
export type UnfreezeCardBody = z.infer<typeof unfreezeCardBody>;

// ---------- /api/cards/[id]/replace ----------
export const replaceCardBody = z.object({
  reason: z.enum(["fraud", "damaged", "lost"]),
  expedited: z.boolean(),
});
export type ReplaceCardBody = z.infer<typeof replaceCardBody>;

// ---------- /api/refunds ----------
export const refundBody = z.object({
  transaction_id: z.string().min(1),
  amount_rwf: rwfAmount,
  reason: z.enum(["duplicate", "fraud", "customer_request"]),
});
export type RefundBody = z.infer<typeof refundBody>;

// Header shape — the route reads `Idempotency-Key` separately from the body.
export const refundHeaders = z.object({
  "idempotency-key": idempotencyKey,
});

// ---------- /api/deposits ----------
// Top-up the user's own balance. Demo-only: in a real app this would be
// the result of an inbound mobile-money or bank transfer.
export const depositBody = z.object({
  amount_rwf: rwfAmount.max(10_000_000), // 10M RWF/top-up cap so a typo doesn't break the UX
  source: z
    .enum(["bank_transfer", "mtn_momo", "airtel_money", "cash_deposit"])
    .default("bank_transfer"),
});
export type DepositBody = z.infer<typeof depositBody>;

// ---------- /api/services/electricity ----------
// EUCL prepaid cash-power purchase.
export const electricityBody = z.object({
  meter_number: z
    .string()
    .trim()
    .regex(/^\d{8,16}$/, "Meter number must be 8–16 digits"),
  amount_rwf: rwfAmount.max(1_000_000),
});
export type ElectricityBody = z.infer<typeof electricityBody>;

// ---------- /api/services/airtime ----------
export const airtimeBody = z.object({
  provider: z.enum(["mtn", "airtel"]),
  phone_e164: z
    .string()
    .trim()
    .regex(/^\+?\d{10,15}$/, "Phone number must be 10–15 digits"),
  amount_rwf: rwfAmount.max(200_000),
});
export type AirtimeBody = z.infer<typeof airtimeBody>;

// ---------- /api/transfers ----------
export const transferBody = z.object({
  recipient_email: z.string().trim().toLowerCase().email(),
  amount_rwf: rwfAmount,
  note: z.string().max(280).optional(),
});
export type TransferBody = z.infer<typeof transferBody>;

export const transferHeaders = z.object({
  "idempotency-key": idempotencyKey,
});

// ---------- /api/disputes ----------
export const disputeBody = z.object({
  transaction_id: z.string().min(1),
  reason: z.enum(["fraud", "duplicate", "not_received", "wrong_amount"]),
  evidence: z
    .object({
      device_fingerprint_mismatch: z.boolean().optional(),
      geo_anomaly: z.boolean().optional(),
    })
    .catchall(z.unknown())
    .optional(),
});
export type DisputeBody = z.infer<typeof disputeBody>;

export const disputeHeaders = z.object({
  "idempotency-key": idempotencyKey,
});

// ---------- /api/otp/send ----------
export const otpSendBody = z.object({
  purpose: z.enum(["refund_confirm", "limit_change", "login"]),
});
export type OtpSendBody = z.infer<typeof otpSendBody>;

// ---------- /api/otp/verify ----------
export const otpVerifyBody = z.object({
  otp_id: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});
export type OtpVerifyBody = z.infer<typeof otpVerifyBody>;

// ---------- /api/kyc/submit ----------
export const kycSubmitBody = z.object({
  id_image_path: z.string().min(1),
  selfie_image_path: z.string().min(1),
});
export type KycSubmitBody = z.infer<typeof kycSubmitBody>;

// ---------- /api/admin/demo-reset ----------
export const demoResetBody = z
  .object({
    scope: z.enum(["all", "user"]).default("all"),
    user_id: z.string().optional(),
  })
  .refine(
    (v) => v.scope !== "user" || !!v.user_id,
    "user_id required when scope is 'user'",
  );
export type DemoResetBody = z.infer<typeof demoResetBody>;

// ---------- Standard response shapes ----------
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string } };
export type ApiResponse<T> = ApiOk<T> | ApiErr;
