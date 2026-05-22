import { type NextRequest, type NextResponse } from "next/server";
import { createCard, terminateCard } from "@/lib/card-provider";
import { adminDb, FieldValue } from "@/lib/firebase-admin";
import {
  effectiveUid,
  jsonErr,
  jsonOk,
  loadCardForActor,
  logApiCall,
  requireAuth,
  requireBody,
} from "@/lib/api-helpers";
import { replaceCardBody } from "@/lib/schemas";
import { COLLECTIONS } from "@/lib/types";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const t0 = Date.now();
  const { id: oldCardId } = await ctx.params;
  const endpoint = `/api/cards/${oldCardId}/replace`;
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    uid = effectiveUid(auth.auth);

    const body = await requireBody(req, replaceCardBody);
    if (!body.ok) return jsonErr(body.error, body.status);

    const card = await loadCardForActor(oldCardId, auth.auth);
    if (!card.ok) return jsonErr(card.error, card.status);

    if (card.cardData.status === "terminated") {
      return jsonErr(
        { code: "card_terminated", message: "Card is already terminated" },
        409,
      );
    }

    // Look up the user's full name for the new card.
    const userSnap = await adminDb.collection(COLLECTIONS.users).doc(uid).get();
    const userData = userSnap.data() as
      | { full_name?: string; email?: string }
      | undefined;
    const holderName = userData?.full_name ?? "Lemonpay Cardholder";
    const email = userData?.email ?? "";

    // Provider: terminate old, issue new.
    const oldProviderId = String(card.cardData.flutterwave_card_id ?? "");
    const terminated = await terminateCard(oldProviderId);
    if (!terminated.ok) {
      return jsonErr(
        { code: "provider_error", message: terminated.error.message },
        502,
      );
    }
    const issued = await createCard({ holder_name: holderName, email });
    if (!issued.ok) {
      return jsonErr({ code: "provider_error", message: issued.error.message }, 502);
    }

    // Update old card → terminated; create new card row.
    await adminDb.collection("cards").doc(oldCardId).update({
      status: "terminated",
      terminated_at: FieldValue.serverTimestamp(),
      termination_reason: body.data.reason,
    });

    const newRef = adminDb.collection("cards").doc();
    await newRef.set({
      user_id: uid,
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
      replaced_from: oldCardId,
    });

    const arrival = body.data.expedited ? "1 business day" : "2-5 business days";

    return jsonOk({
      old_card_id: oldCardId,
      new_card_id: newRef.id,
      expected_arrival: arrival,
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
