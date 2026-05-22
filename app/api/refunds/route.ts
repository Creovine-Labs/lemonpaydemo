import { type NextRequest, type NextResponse } from "next/server";
import { createRefund } from "@/lib/card-provider";
import {
  effectiveUid,
  jsonErr,
  jsonOk,
  logApiCall,
  requireAuth,
  requireBody,
  withIdempotency,
} from "@/lib/api-helpers";
import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { verifyOtpToken } from "@/lib/otp-token";
import { refundBody } from "@/lib/schemas";
import { COLLECTIONS, type Transaction } from "@/lib/types";

const LIRA_APPROVAL_THRESHOLD = 250_000; // RWF — anything above requires step-up or Lira

type RunResult =
  | {
      ok: true;
      data: {
        refund_id: string;
        provider_refund_id: string;
        status: "completed";
        expected_in_account: string;
      };
    }
  | { ok: false; status: number; error: { code: string; message: string } };

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const endpoint = `/api/refunds`;
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    const actorUid = effectiveUid(auth.auth);
    uid = actorUid;

    const body = await requireBody(req, refundBody);
    if (!body.ok) return jsonErr(body.error, body.status);

    // Step-up auth: refunds over the threshold need an OTP verification token
    // (or Lira service-account auth, which is allowed unconditionally).
    if (auth.auth.kind === "customer" && body.data.amount_rwf > LIRA_APPROVAL_THRESHOLD) {
      const stepUp = req.headers.get("x-otp-token");
      if (!stepUp) {
        return jsonErr(
          {
            code: "step_up_required",
            message: `Refunds over RWF ${LIRA_APPROVAL_THRESHOLD.toLocaleString()} require OTP verification`,
          },
          401,
        );
      }
      const check = verifyOtpToken(stepUp, { uid: actorUid, purpose: "refund_confirm" });
      if (!check.ok) {
        return jsonErr(
          { code: "invalid_otp_token", message: `Step-up token rejected: ${check.reason}` },
          401,
        );
      }
    }

    // Everything that mutates state — including transaction validation — runs
    // inside the idempotency closure so retries return the cached result
    // instead of failing on "already_refunded".
    const run = async (): Promise<RunResult> => {
      const txRef = adminDb.collection(COLLECTIONS.transactions).doc(body.data.transaction_id);
      const txSnap = await txRef.get();
      if (!txSnap.exists) {
        return {
          ok: false,
          status: 404,
          error: { code: "transaction_not_found", message: "Transaction not found" },
        };
      }
      const tx = txSnap.data() as Transaction;
      if (tx.user_id !== actorUid) {
        return {
          ok: false,
          status: 403,
          error: { code: "forbidden", message: "Transaction does not belong to caller" },
        };
      }
      if (tx.status === "refunded") {
        return {
          ok: false,
          status: 409,
          error: { code: "already_refunded", message: "Transaction already refunded" },
        };
      }
      if (body.data.amount_rwf > tx.amount_rwf) {
        return {
          ok: false,
          status: 400,
          error: {
            code: "amount_exceeds_charge",
            message: "Refund amount cannot exceed the original charge",
          },
        };
      }

      const provider = await createRefund({
        tx_ref: tx.flutterwave_tx_ref ?? body.data.transaction_id,
        amount_rwf: body.data.amount_rwf,
      });
      if (!provider.ok) {
        return {
          ok: false,
          status: 502,
          error: { code: "provider_error", message: provider.error.message },
        };
      }

      // Write the refund as a new transaction row + flip the original to "refunded".
      const newTxRef = adminDb.collection(COLLECTIONS.transactions).doc();
      const batch = adminDb.batch();

      batch.set(newTxRef, {
        user_id: actorUid,
        card_id: tx.card_id ?? null,
        flutterwave_tx_ref: provider.data.id,
        merchant_name: tx.merchant_name,
        merchant_id: tx.merchant_id,
        merchant_category: tx.merchant_category,
        amount_rwf: body.data.amount_rwf,
        currency: "RWF",
        status: "posted",
        type: "refund",
        posted_at: FieldValue.serverTimestamp(),
        metadata: {
          source: "/api/refunds",
          refund_of: body.data.transaction_id,
          reason: body.data.reason,
        },
      });

      batch.update(txRef, { status: "refunded" });

      // Bump the account balance back up.
      const accountSnap = await adminDb
        .collection(COLLECTIONS.accounts)
        .where("user_id", "==", actorUid)
        .limit(1)
        .get();
      if (!accountSnap.empty) {
        batch.update(accountSnap.docs[0]!.ref, {
          balance_rwf: FieldValue.increment(body.data.amount_rwf),
        });
      }

      await batch.commit();

      return {
        ok: true,
        data: {
          refund_id: newTxRef.id,
          provider_refund_id: provider.data.id,
          status: "completed",
          expected_in_account: "30 seconds",
        },
      };
    };

    const result = await withIdempotency(req, "refunds", run);
    if (result.kind === "missing_key") return jsonErr(result.error, 400);

    if (!result.data.ok) {
      return jsonErr(result.data.error, result.data.status);
    }
    return jsonOk(result.data.data);
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
