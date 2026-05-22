import { type NextRequest, type NextResponse } from "next/server";
import {
  createCard,
  fileDispute,
  freezeCard,
  terminateCard,
} from "@/lib/card-provider";
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
import { disputeBody } from "@/lib/schemas";
import { COLLECTIONS, type Card, type Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const endpoint = `/api/disputes`;
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    const actorUid = effectiveUid(auth.auth);
    uid = actorUid;

    const body = await requireBody(req, disputeBody);
    if (!body.ok) return jsonErr(body.error, body.status);

    const run = async () => {
      // Validate inside the idempotency closure so retries return the cached
      // result instead of failing on "already_disputed".
      const txRef = adminDb
        .collection(COLLECTIONS.transactions)
        .doc(body.data.transaction_id);
      const txSnap = await txRef.get();
      if (!txSnap.exists) {
        return {
          ok: false as const,
          status: 404,
          error: { code: "transaction_not_found", message: "Transaction not found" },
        };
      }
      const tx = txSnap.data() as Transaction;
      if (tx.user_id !== actorUid) {
        return {
          ok: false as const,
          status: 403,
          error: { code: "forbidden", message: "Transaction does not belong to caller" },
        };
      }
      if (tx.status === "disputed") {
        return {
          ok: false as const,
          status: 409,
          error: { code: "already_disputed", message: "Transaction already under dispute" },
        };
      }

      // File the dispute with the provider (mocked) → get provisional credit.
      const provider = await fileDispute({
        tx_ref: tx.flutterwave_tx_ref ?? body.data.transaction_id,
        amount_rwf: tx.amount_rwf,
      });
      if (!provider.ok) {
        return {
          ok: false as const,
          status: 502,
          error: { code: "provider_error", message: provider.error.message },
        };
      }

      const disputeRef = adminDb.collection(COLLECTIONS.disputes).doc();

      // For fraud disputes: freeze the card and issue a replacement.
      let cardReplacement: { old_card_id: string; new_card_id: string } | null = null;
      if (body.data.reason === "fraud" && tx.card_id) {
        const cardRef = adminDb.collection(COLLECTIONS.cards).doc(tx.card_id);
        const cardSnap = await cardRef.get();
        if (cardSnap.exists) {
          const card = cardSnap.data() as Card;
          const providerId = String(card.flutterwave_card_id);

          if (card.status === "active") await freezeCard(providerId);
          const terminated = await terminateCard(providerId);
          const userSnap = await adminDb.collection(COLLECTIONS.users).doc(actorUid).get();
          const userData = userSnap.data() as
            | { full_name?: string; email?: string }
            | undefined;
          const issued = await createCard({
            holder_name: userData?.full_name ?? "Lemonpay Cardholder",
            email: userData?.email ?? "",
          });

          if (terminated.ok && issued.ok) {
            await cardRef.update({
              status: "terminated",
              terminated_at: FieldValue.serverTimestamp(),
              termination_reason: "fraud_dispute",
            });
            const newCardRef = adminDb.collection(COLLECTIONS.cards).doc();
            await newCardRef.set({
              user_id: actorUid,
              flutterwave_card_id: issued.data.id,
              last4: issued.data.last4,
              brand: issued.data.brand,
              type: "virtual",
              status: "active",
              expiry_month: issued.data.expiry_month,
              expiry_year: issued.data.expiry_year,
              created_at: FieldValue.serverTimestamp(),
              frozen_at: null,
              terminated_at: null,
              replaced_from: tx.card_id,
            });
            cardReplacement = { old_card_id: tx.card_id, new_card_id: newCardRef.id };
          }
        }
      }

      // Write the dispute doc + mark the transaction disputed in one batch.
      const batch = adminDb.batch();
      batch.set(disputeRef, {
        user_id: actorUid,
        transaction_id: body.data.transaction_id,
        flutterwave_dispute_id: provider.data.id,
        reason: body.data.reason,
        status: "provisional_credit_issued",
        amount_rwf: tx.amount_rwf,
        evidence: body.data.evidence ?? {},
        filed_at: FieldValue.serverTimestamp(),
        resolved_at: null,
      });
      batch.update(txRef, { status: "disputed" });

      // Provisional credit goes to the user's account balance immediately.
      const accountSnap = await adminDb
        .collection(COLLECTIONS.accounts)
        .where("user_id", "==", actorUid)
        .limit(1)
        .get();
      if (!accountSnap.empty) {
        batch.update(accountSnap.docs[0]!.ref, {
          balance_rwf: FieldValue.increment(tx.amount_rwf),
        });
      }

      await batch.commit();

      return {
        ok: true as const,
        data: {
          dispute_id: disputeRef.id,
          provisional_credit_amount: tx.amount_rwf,
          provisional_credit_eta: "1 business day",
          card_replacement: cardReplacement,
        },
      };
    };

    const result = await withIdempotency(req, "disputes", run);
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
