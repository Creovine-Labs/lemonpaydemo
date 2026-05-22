import bcrypt from "bcryptjs";
import { type NextRequest, type NextResponse } from "next/server";
import {
  effectiveUid,
  jsonErr,
  jsonOk,
  logApiCall,
  requireAuth,
  requireBody,
} from "@/lib/api-helpers";
import { adminDb, FieldValue, Timestamp } from "@/lib/firebase-admin";
import { signOtpToken } from "@/lib/otp-token";
import { otpVerifyBody } from "@/lib/schemas";
import { COLLECTIONS, type OtpCode } from "@/lib/types";

const MAX_ATTEMPTS = 5;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const endpoint = `/api/otp/verify`;
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    uid = effectiveUid(auth.auth);

    const body = await requireBody(req, otpVerifyBody);
    if (!body.ok) return jsonErr(body.error, body.status);

    const ref = adminDb.collection(COLLECTIONS.otp_codes).doc(body.data.otp_id);
    const snap = await ref.get();
    if (!snap.exists) {
      return jsonErr({ code: "otp_not_found", message: "OTP id not found" }, 404);
    }
    const otp = snap.data() as OtpCode & { attempt_count?: number };

    if (otp.user_id !== uid) {
      return jsonErr(
        { code: "forbidden", message: "OTP does not belong to caller" },
        403,
      );
    }
    if (otp.consumed) {
      return jsonErr(
        { code: "otp_consumed", message: "OTP has already been used" },
        409,
      );
    }
    const expiresMs =
      (otp.expires_at as unknown as Timestamp).toMillis?.() ??
      Number(otp.expires_at);
    if (Date.now() > expiresMs) {
      return jsonErr({ code: "otp_expired", message: "OTP expired" }, 410);
    }

    const attempts = (otp.attempt_count ?? 0) + 1;
    const ok = await bcrypt.compare(body.data.code, otp.code_hash);

    if (!ok) {
      const invalidated = attempts >= MAX_ATTEMPTS;
      await ref.update({
        attempt_count: attempts,
        consumed: invalidated, // burn the OTP after MAX_ATTEMPTS wrong tries
      });
      return jsonErr(
        {
          code: invalidated ? "otp_locked" : "otp_invalid",
          message: invalidated
            ? "Too many wrong attempts; OTP invalidated"
            : `Wrong code (${attempts}/${MAX_ATTEMPTS} attempts used)`,
        },
        401,
      );
    }

    await ref.update({
      consumed: true,
      consumed_at: FieldValue.serverTimestamp(),
      attempt_count: attempts,
    });

    const { token, expiresInSeconds } = signOtpToken({
      uid,
      purpose: otp.purpose,
      otpId: body.data.otp_id,
    });

    return jsonOk({
      verification_token: token,
      expires_in_seconds: expiresInSeconds,
      purpose: otp.purpose,
    });
  };

  const res = await handle();
  logApiCall({
    endpoint,
    method: "POST",
    uid,
    statusCode: res.status,
    durationMs: Date.now() - t0,
  });
  return res;
}
