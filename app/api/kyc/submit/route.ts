import { type NextRequest, type NextResponse } from "next/server";
import {
  effectiveUid,
  jsonErr,
  jsonOk,
  logApiCall,
  requireAuth,
  requireBody,
} from "@/lib/api-helpers";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";
import { mockKyc } from "@/lib/kyc-mock";
import { kycSubmitBody } from "@/lib/schemas";
import { COLLECTIONS } from "@/lib/types";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const endpoint = `/api/kyc/submit`;
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    uid = effectiveUid(auth.auth);

    const body = await requireBody(req, kycSubmitBody);
    if (!body.ok) return jsonErr(body.error, body.status);

    // Count prior attempts to make this 1-indexed.
    const prior = await adminDb
      .collection(COLLECTIONS.kyc_attempts)
      .where("user_id", "==", uid)
      .count()
      .get();
    const attemptNumber = prior.data().count + 1;

    // Look up the demo handle from the custom claim (set in the seed) so the
    // mock can return the seeded result for Marcus.
    let demoHandle: string | undefined;
    try {
      const userRecord = await adminAuth.getUser(uid);
      const claims = (userRecord.customClaims ?? {}) as { demoHandle?: string };
      demoHandle = claims.demoHandle;
    } catch {
      // not fatal — proceed without demoHandle
    }

    const result = await mockKyc({ demoHandle, attemptNumber });

    const attemptRef = adminDb.collection(COLLECTIONS.kyc_attempts).doc();
    await attemptRef.set({
      user_id: uid,
      attempt_number: attemptNumber,
      id_image_path: body.data.id_image_path,
      selfie_image_path: body.data.selfie_image_path,
      status: result.status,
      failure_reason: result.status === "failed" ? result.failure_reason : null,
      submitted_at: FieldValue.serverTimestamp(),
      resolved_at: FieldValue.serverTimestamp(),
    });

    // Promote the user to "active" on pass; otherwise mark "kyc_failed".
    // The Firestore security rule blocks clients from writing status, so the
    // server (Admin SDK) is the only path to this transition.
    await adminDb.collection(COLLECTIONS.users).doc(uid).update({
      status: result.status === "passed" ? "active" : "kyc_failed",
    });

    return jsonOk({
      attempt_id: attemptRef.id,
      status: result.status,
      failure_reason: result.status === "failed" ? result.failure_reason : undefined,
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
