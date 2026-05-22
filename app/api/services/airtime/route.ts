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
import { airtimeBody } from "@/lib/schemas";
import { COLLECTIONS } from "@/lib/types";

export const dynamic = "force-dynamic";

const PROVIDER_LABELS = { mtn: "MTN", airtel: "Airtel" } as const;

/**
 * Simulated airtime purchase. Debits the caller's balance and creates a
 * purchase transaction tagged to MTN or Airtel.
 */
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const endpoint = `/api/services/airtime`;
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    const actorUid = effectiveUid(auth.auth);
    uid = actorUid;

    const body = await requireBody(req, airtimeBody);
    if (!body.ok) return jsonErr(body.error, body.status);

    const accountSnap = await adminDb
      .collection(COLLECTIONS.accounts)
      .where("user_id", "==", actorUid)
      .limit(1)
      .get();
    if (accountSnap.empty) {
      return jsonErr({ code: "no_account", message: "No account on file" }, 400);
    }
    const accountRef = accountSnap.docs[0]!.ref;

    const newTxRef = adminDb.collection(COLLECTIONS.transactions).doc();
    const providerLabel = PROVIDER_LABELS[body.data.provider];

    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(accountRef);
      const balance = Number(
        (snap.data() as { balance_rwf?: number } | undefined)?.balance_rwf ?? 0,
      );
      if (balance < body.data.amount_rwf) {
        return { ok: false as const };
      }
      tx.update(accountRef, {
        balance_rwf: FieldValue.increment(-body.data.amount_rwf),
      });
      tx.set(newTxRef, {
        user_id: actorUid,
        card_id: null,
        flutterwave_tx_ref: null,
        merchant_name: `${providerLabel} Airtime`,
        merchant_id: `${body.data.provider}_airtime`,
        merchant_category: "Subscriptions",
        amount_rwf: body.data.amount_rwf,
        currency: "RWF",
        status: "posted",
        type: "purchase",
        posted_at: FieldValue.serverTimestamp(),
        metadata: {
          source: "/api/services/airtime",
          phone: body.data.phone_e164,
          provider: body.data.provider,
        },
      });
      return { ok: true as const };
    });

    if (!result.ok) {
      return jsonErr(
        { code: "insufficient_funds", message: "Your balance is too low" },
        400,
      );
    }

    return jsonOk({
      tx_id: newTxRef.id,
      phone: body.data.phone_e164,
      provider: body.data.provider,
      amount_rwf: body.data.amount_rwf,
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
