import bcrypt from "bcryptjs";
import { type NextRequest, type NextResponse } from "next/server";
import crypto from "node:crypto";
import { sendSms } from "@/lib/africastalking";
import {
  effectiveUid,
  jsonErr,
  jsonOk,
  logApiCall,
  requireAuth,
  requireBody,
} from "@/lib/api-helpers";
import { adminDb, FieldValue, Timestamp } from "@/lib/firebase-admin";
import { otpSendBody } from "@/lib/schemas";
import { COLLECTIONS } from "@/lib/types";

const RATE_LIMIT = 3; // max OTPs per user per hour
const RATE_WINDOW_MS = 60 * 60 * 1000;
const TTL_SECONDS = 5 * 60;

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const endpoint = `/api/otp/send`;
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    const actorUid = effectiveUid(auth.auth);
    uid = actorUid;

    const body = await requireBody(req, otpSendBody);
    if (!body.ok) return jsonErr(body.error, body.status);

    // Rate limit: count OTPs sent to this user in the last hour. If the
    // composite index isn't ready yet (fresh project), we fail open rather
    // than 500 — the demo can't be held up by index build time.
    try {
      const cutoff = Timestamp.fromMillis(Date.now() - RATE_WINDOW_MS);
      const recent = await adminDb
        .collection(COLLECTIONS.otp_codes)
        .where("user_id", "==", actorUid)
        .where("created_at", ">=", cutoff)
        .count()
        .get();
      if (recent.data().count >= RATE_LIMIT) {
        return jsonErr(
          {
            code: "rate_limited",
            message: `Too many OTP requests. Limit ${RATE_LIMIT}/hour.`,
          },
          429,
        );
      }
    } catch (err) {
      console.warn(
        "OTP rate-limit check failed; allowing send. Reason:",
        err instanceof Error ? err.message : err,
      );
    }

    // Load user's phone number.
    const userSnap = await adminDb.collection(COLLECTIONS.users).doc(actorUid).get();
    const userData = userSnap.data() as { phone_e164?: string } | undefined;
    const phone = userData?.phone_e164;
    if (!phone) {
      return jsonErr(
        { code: "no_phone", message: "User has no phone number on file" },
        400,
      );
    }

    // Generate 6-digit code + bcrypt hash. Persist hash only.
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = await bcrypt.hash(code, 10);

    const otpRef = adminDb.collection(COLLECTIONS.otp_codes).doc();
    await otpRef.set({
      user_id: actorUid,
      code_hash: codeHash,
      purpose: body.data.purpose,
      expires_at: Timestamp.fromMillis(Date.now() + TTL_SECONDS * 1000),
      consumed: false,
      attempt_count: 0,
      created_at: FieldValue.serverTimestamp(),
    });

    // Fire the SMS. We log but don't fail the request if AT is down — the
    // OTP doc still exists, so the customer can request a resend.
    const sms = await sendSms({
      to: phone,
      message: `Lemonpay code: ${code}. Expires in 5 minutes.`,
    });

    if (!sms.ok) {
      // Surface the failure but with a code that's safe for the client.
      return jsonErr(
        {
          code: "sms_failed",
          message: `Couldn't send SMS (${sms.error.code}). Please try again.`,
        },
        502,
      );
    }

    return jsonOk({
      otp_id: otpRef.id,
      expires_in_seconds: TTL_SECONDS,
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
