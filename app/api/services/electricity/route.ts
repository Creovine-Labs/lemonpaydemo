import crypto from "node:crypto";
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
import { electricityBody } from "@/lib/schemas";
import { COLLECTIONS } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Simulated EUCL prepaid cash-power purchase. Debits the caller's balance
 * and returns a fake 20-digit token. No real EUCL integration.
 */
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const endpoint = `/api/services/electricity`;
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    const actorUid = effectiveUid(auth.auth);
    uid = actorUid;

    const body = await requireBody(req, electricityBody);
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

    // Generate a believable 20-digit cash-power token in groups of 4.
    const token = Array.from({ length: 5 }, () =>
      String(crypto.randomInt(0, 10_000)).padStart(4, "0"),
    ).join("-");
    // Cash-power typically gives ~1 kWh per 200 RWF for residential.
    const units = Math.round((body.data.amount_rwf / 200) * 10) / 10;

    const newTxRef = adminDb.collection(COLLECTIONS.transactions).doc();

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
        merchant_name: "EUCL Cash Power",
        merchant_id: "eucl_cashpower",
        merchant_category: "Utilities",
        amount_rwf: body.data.amount_rwf,
        currency: "RWF",
        status: "posted",
        type: "purchase",
        posted_at: FieldValue.serverTimestamp(),
        metadata: {
          source: "/api/services/electricity",
          meter_number: body.data.meter_number,
          token,
          units_kwh: units,
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
      meter_number: body.data.meter_number,
      amount_rwf: body.data.amount_rwf,
      token,
      units_kwh: units,
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
