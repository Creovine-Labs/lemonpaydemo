import { type NextRequest, type NextResponse } from "next/server";
import {
  effectiveUid,
  jsonErr,
  jsonOk,
  logApiCall,
  requireAuth,
  requireBody,
} from "@/lib/api-helpers";
import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { depositBody } from "@/lib/schemas";
import { COLLECTIONS } from "@/lib/types";

export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  cash_deposit: "Cash deposit",
};

/**
 * Demo top-up. Atomically credits the caller's account and writes a
 * transfer_in transaction row tagged with the funding source.
 *
 * Demo-only because no real money is moving. In production this endpoint
 * would only ever be invoked by an inbound payment-provider webhook.
 */
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const endpoint = `/api/deposits`;
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    const actorUid = effectiveUid(auth.auth);
    uid = actorUid;

    const body = await requireBody(req, depositBody);
    if (!body.ok) return jsonErr(body.error, body.status);

    const accountSnap = await adminDb
      .collection(COLLECTIONS.accounts)
      .where("user_id", "==", actorUid)
      .limit(1)
      .get();
    if (accountSnap.empty) {
      return jsonErr(
        { code: "no_account", message: "No account on file" },
        400,
      );
    }
    const accountRef = accountSnap.docs[0]!.ref;

    const newTxRef = adminDb.collection(COLLECTIONS.transactions).doc();
    const sourceLabel = SOURCE_LABELS[body.data.source] ?? "Top up";

    const result = await adminDb.runTransaction(async (tx) => {
      tx.update(accountRef, {
        balance_rwf: FieldValue.increment(body.data.amount_rwf),
      });
      tx.set(newTxRef, {
        user_id: actorUid,
        card_id: null,
        flutterwave_tx_ref: null,
        merchant_name: `Top up · ${sourceLabel}`,
        merchant_id: `topup:${body.data.source}`,
        merchant_category: "Deposits",
        amount_rwf: body.data.amount_rwf,
        currency: "RWF",
        status: "posted",
        type: "transfer_in",
        posted_at: FieldValue.serverTimestamp(),
        metadata: { source: body.data.source },
      });
      return { tx_id: newTxRef.id };
    });

    return jsonOk({
      tx_id: result.tx_id,
      amount_rwf: body.data.amount_rwf,
      source: body.data.source,
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
