import { type NextRequest, type NextResponse } from "next/server";
import { freezeCard } from "@/lib/card-provider";
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
import { freezeCardBody } from "@/lib/schemas";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const t0 = Date.now();
  const { id: cardId } = await ctx.params;
  const endpoint = `/api/cards/${cardId}/freeze`;
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    uid = effectiveUid(auth.auth);

    const body = await requireBody(req, freezeCardBody);
    if (!body.ok) return jsonErr(body.error, body.status);

    const card = await loadCardForActor(cardId, auth.auth);
    if (!card.ok) return jsonErr(card.error, card.status);

    if (card.cardData.status === "frozen") {
      return jsonOk({ card_id: cardId, status: "frozen", already: true });
    }
    if (card.cardData.status === "terminated") {
      return jsonErr(
        { code: "card_terminated", message: "Cannot freeze a terminated card" },
        409,
      );
    }

    const providerId = String(card.cardData.flutterwave_card_id ?? "");
    const provider = await freezeCard(providerId);
    if (!provider.ok) {
      return jsonErr({ code: "provider_error", message: provider.error.message }, 502);
    }

    await adminDb.collection("cards").doc(cardId).update({
      status: "frozen",
      frozen_at: FieldValue.serverTimestamp(),
      freeze_reason: body.data.reason,
    });

    return jsonOk({ card_id: cardId, status: "frozen" });
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
