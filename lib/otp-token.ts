import jwt from "jsonwebtoken";
import type { OtpCode } from "./types";

const TOKEN_TTL_SECONDS = 5 * 60;

export interface OtpVerifyClaims {
  sub: string; // user uid
  purpose: OtpCode["purpose"];
  otp_id: string;
  iat: number;
  exp: number;
}

function getSecret(): string {
  const s = process.env.OTP_JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("OTP_JWT_SECRET missing or too short (set 32+ chars in .env.local)");
  }
  return s;
}

export function signOtpToken(input: {
  uid: string;
  purpose: OtpCode["purpose"];
  otpId: string;
}): { token: string; expiresInSeconds: number } {
  const token = jwt.sign(
    { sub: input.uid, purpose: input.purpose, otp_id: input.otpId },
    getSecret(),
    { expiresIn: TOKEN_TTL_SECONDS },
  );
  return { token, expiresInSeconds: TOKEN_TTL_SECONDS };
}

export function verifyOtpToken(
  token: string,
  expected: { uid: string; purpose: OtpCode["purpose"] },
): { ok: true; otp_id: string } | { ok: false; reason: string } {
  try {
    const claims = jwt.verify(token, getSecret()) as OtpVerifyClaims;
    if (claims.sub !== expected.uid) return { ok: false, reason: "wrong_subject" };
    if (claims.purpose !== expected.purpose) {
      return { ok: false, reason: "wrong_purpose" };
    }
    return { ok: true, otp_id: claims.otp_id };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "invalid_token",
    };
  }
}
