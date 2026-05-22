import { type NextRequest, type NextResponse } from "next/server";
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
import { transferBody } from "@/lib/schemas";
import { COLLECTIONS, type User } from "@/lib/types";

type RunResult =
  | {
      ok: true;
      data: {
        sender_tx_id: string;
        recipient_tx_id: string;
        amount_rwf: number;
        recipient_name: string;
      };
    }
  | { ok: false; status: number; error: { code: string; message: string } };

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const endpoint = `/api/transfers`;
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    const actorUid = effectiveUid(auth.auth);
    uid = actorUid;

    const body = await requireBody(req, transferBody);
    if (!body.ok) return jsonErr(body.error, body.status);

    const run = async (): Promise<RunResult> => {
      // Resolve recipient by email. Emails are unique in our users collection.
      const recipientSnap = await adminDb
        .collection(COLLECTIONS.users)
        .where("email", "==", body.data.recipient_email)
        .limit(1)
        .get();
      if (recipientSnap.empty) {
        return {
          ok: false,
          status: 404,
          error: {
            code: "recipient_not_found",
            message: "No Lemonpay account uses that email",
          },
        };
      }
      const recipientUid = recipientSnap.docs[0]!.id;
      const recipient = recipientSnap.docs[0]!.data() as User;
      if (recipientUid === actorUid) {
        return {
          ok: false,
          status: 400,
          error: { code: "cannot_send_to_self", message: "You can't send money to yourself" },
        };
      }
      if (recipient.status !== "active") {
        return {
          ok: false,
          status: 400,
          error: {
            code: "recipient_inactive",
            message: "Recipient isn't fully verified yet",
          },
        };
      }

      // Pick sender + recipient accounts (each user has one for the demo).
      const senderAccountSnap = await adminDb
        .collection(COLLECTIONS.accounts)
        .where("user_id", "==", actorUid)
        .limit(1)
        .get();
      if (senderAccountSnap.empty) {
        return {
          ok: false,
          status: 400,
          error: { code: "no_sender_account", message: "Sender has no account" },
        };
      }
      const recipientAccountSnap = await adminDb
        .collection(COLLECTIONS.accounts)
        .where("user_id", "==", recipientUid)
        .limit(1)
        .get();
      if (recipientAccountSnap.empty) {
        return {
          ok: false,
          status: 400,
          error: { code: "no_recipient_account", message: "Recipient has no account" },
        };
      }

      const senderAccountRef = senderAccountSnap.docs[0]!.ref;
      const recipientAccountRef = recipientAccountSnap.docs[0]!.ref;

      // Atomic balance + transactions. Transaction ensures the balance check
      // happens against the same snapshot we debit from.
      const result = await adminDb.runTransaction(async (tx) => {
        const senderFresh = await tx.get(senderAccountRef);
        const balance = Number(
          (senderFresh.data() as { balance_rwf?: number } | undefined)
            ?.balance_rwf ?? 0,
        );
        if (balance < body.data.amount_rwf) {
          return { ok: false as const, code: "insufficient_funds" };
        }

        const senderTxRef = adminDb.collection(COLLECTIONS.transactions).doc();
        const recipientTxRef = adminDb.collection(COLLECTIONS.transactions).doc();
        const counterpartyLabel = recipient.full_name || body.data.recipient_email;
        const senderLabel = recipient.full_name; // recipient sees who sent it — we look up sender below
        const note = body.data.note ?? null;

        tx.update(senderAccountRef, {
          balance_rwf: FieldValue.increment(-body.data.amount_rwf),
        });
        tx.update(recipientAccountRef, {
          balance_rwf: FieldValue.increment(body.data.amount_rwf),
        });

        tx.set(senderTxRef, {
          user_id: actorUid,
          card_id: null,
          flutterwave_tx_ref: null,
          merchant_name: `Sent to ${counterpartyLabel}`,
          merchant_id: `peer:${recipientUid}`,
          merchant_category: "Transfers",
          amount_rwf: body.data.amount_rwf,
          currency: "RWF",
          status: "posted",
          type: "transfer_out",
          posted_at: FieldValue.serverTimestamp(),
          metadata: {
            source: "/api/transfers",
            recipient_uid: recipientUid,
            recipient_email: body.data.recipient_email,
            note,
          },
        });

        tx.set(recipientTxRef, {
          user_id: recipientUid,
          card_id: null,
          flutterwave_tx_ref: null,
          merchant_name: `From ${senderLabel || "another Lemonpay user"}`,
          merchant_id: `peer:${actorUid}`,
          merchant_category: "Transfers",
          amount_rwf: body.data.amount_rwf,
          currency: "RWF",
          status: "posted",
          type: "transfer_in",
          posted_at: FieldValue.serverTimestamp(),
          metadata: {
            source: "/api/transfers",
            sender_uid: actorUid,
            note,
          },
        });

        return {
          ok: true as const,
          sender_tx_id: senderTxRef.id,
          recipient_tx_id: recipientTxRef.id,
        };
      });

      if (!result.ok) {
        return {
          ok: false,
          status: 400,
          error: {
            code: "insufficient_funds",
            message: "Your balance is too low for this transfer",
          },
        };
      }

      return {
        ok: true,
        data: {
          sender_tx_id: result.sender_tx_id,
          recipient_tx_id: result.recipient_tx_id,
          amount_rwf: body.data.amount_rwf,
          recipient_name: recipient.full_name,
        },
      };
    };

    const idem = await withIdempotency(req, "transfers", run);
    if (idem.kind === "missing_key") return jsonErr(idem.error, 400);
    if (!idem.data.ok) return jsonErr(idem.data.error, idem.data.status);
    return jsonOk(idem.data.data);
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
