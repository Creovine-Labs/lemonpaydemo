import { type NextRequest, NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { logApiCall } from "@/lib/api-helpers";
import { COLLECTIONS } from "@/lib/types";

/**
 * Inbound webhook receiver. No bearer-token auth — security comes from the
 * `verif-hash` header matching FLW_SECRET_HASH.
 *
 * Note: Flutterwave webhooks won't actually fire for the Lemonpay demo because
 * we use the mock card provider (lib/card-provider.ts). This endpoint exists
 * for spec parity and to support replaying recorded payloads during testing.
 */

interface FlwWebhookEvent {
  event: string;
  data: Record<string, unknown>;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const endpoint = `/api/webhooks/flutterwave`;

  const handle = async (): Promise<NextResponse> => {
    const expected = process.env.FLW_SECRET_HASH;
    if (!expected) {
      return NextResponse.json(
        { ok: false, error: { code: "not_configured", message: "FLW_SECRET_HASH not set" } },
        { status: 500 },
      );
    }
    const signature = req.headers.get("verif-hash");
    if (!signature || signature !== expected) {
      // Always return 200 to avoid retries from a spoofed source — but mark
      // the result so the api_log shows the rejection. Flutterwave docs say
      // to verify the hash and silently drop mismatches.
      return NextResponse.json({ ok: false, error: { code: "bad_signature", message: "" } }, { status: 401 });
    }

    let event: FlwWebhookEvent;
    try {
      event = (await req.json()) as FlwWebhookEvent;
    } catch {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_json", message: "Body is not JSON" } },
        { status: 400 },
      );
    }

    // Branch by event type. Most events update an existing Firestore doc by
    // its flutterwave reference.
    switch (event.event) {
      case "charge.completed":
        await handleChargeCompleted(event.data);
        break;
      case "refund.completed":
        await handleRefundCompleted(event.data);
        break;
      case "chargeback.created":
        await handleChargebackCreated(event.data);
        break;
      case "chargeback.resolved":
        await handleChargebackResolved(event.data);
        break;
      default:
        // Unknown events are acknowledged so Flutterwave doesn't retry.
        break;
    }

    return NextResponse.json({ ok: true, data: { event: event.event } });
  };

  const res = await handle();
  logApiCall({
    endpoint,
    method: "POST",
    uid: null,
    statusCode: res.status,
    durationMs: Date.now() - t0,
  });
  return res;
}

interface ChargePayload {
  tx_ref?: string;
  flw_ref?: string;
  status?: string;
}
async function handleChargeCompleted(data: Record<string, unknown>) {
  const d = data as ChargePayload;
  const ref = d.tx_ref ?? d.flw_ref;
  if (!ref) return;
  const snap = await adminDb
    .collection(COLLECTIONS.transactions)
    .where("flutterwave_tx_ref", "==", ref)
    .limit(1)
    .get();
  if (!snap.empty) {
    await snap.docs[0]!.ref.update({
      status: "posted",
      updated_at: FieldValue.serverTimestamp(),
    });
  }
}

async function handleRefundCompleted(data: Record<string, unknown>) {
  const d = data as ChargePayload;
  const ref = d.tx_ref ?? d.flw_ref;
  if (!ref) return;
  const snap = await adminDb
    .collection(COLLECTIONS.transactions)
    .where("flutterwave_tx_ref", "==", ref)
    .limit(1)
    .get();
  if (!snap.empty) {
    await snap.docs[0]!.ref.update({
      status: "refunded",
      updated_at: FieldValue.serverTimestamp(),
    });
  }
}

interface ChargebackPayload {
  id?: string | number;
  tx_id?: string | number;
  status?: string;
}
async function handleChargebackCreated(data: Record<string, unknown>) {
  const d = data as ChargebackPayload;
  if (!d.id) return;
  const snap = await adminDb
    .collection(COLLECTIONS.disputes)
    .where("flutterwave_dispute_id", "==", String(d.id))
    .limit(1)
    .get();
  if (!snap.empty) {
    await snap.docs[0]!.ref.update({
      status: "provisional_credit_issued",
    });
  }
}

async function handleChargebackResolved(data: Record<string, unknown>) {
  const d = data as ChargebackPayload;
  if (!d.id) return;
  const snap = await adminDb
    .collection(COLLECTIONS.disputes)
    .where("flutterwave_dispute_id", "==", String(d.id))
    .limit(1)
    .get();
  if (!snap.empty) {
    const status = d.status === "lost" ? "lost" : "won";
    await snap.docs[0]!.ref.update({
      status,
      resolved_at: FieldValue.serverTimestamp(),
    });
  }
}
