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
