import crypto from "node:crypto";
import { type NextRequest, type NextResponse } from "next/server";
import {
  effectiveUid,
  jsonErr,
  jsonOk,
  logApiCall,
  requireAuth,
} from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Returns the signed identity payload the Lira widget expects on
 * data-email / data-name / data-sig attributes. The signature is
 * HMAC-SHA256(secret, email) hex-encoded — same convention Intercom and
 * Crisp use, and what Lira's "Settings → Support → Secret" docs describe.
 *
 * Signing happens here (not in the client) so the widget secret never
 * leaves the server.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const t0 = Date.now();
  const endpoint = "/api/lira/identity";
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    const actorUid = effectiveUid(auth.auth);
    uid = actorUid;

    const secret = process.env.LIRA_WIDGET_SECRET;
    if (!secret) {
      return jsonErr(
        { code: "lira_not_configured", message: "LIRA_WIDGET_SECRET is not set" },
        503,
      );
    }

    const userSnap = await adminDb.collection(COLLECTIONS.users).doc(actorUid).get();
    if (!userSnap.exists) {
      return jsonErr({ code: "user_not_found", message: "User not found" }, 404);
    }
    const userData = userSnap.data() as { email?: string; full_name?: string };
    const email = userData.email;
    if (!email) {
      return jsonErr({ code: "no_email", message: "User has no email on file" }, 400);
    }
    const name = userData.full_name ?? "";

    const sig = crypto.createHmac("sha256", secret).update(email).digest("hex");

    return jsonOk({ email, name, sig });
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
