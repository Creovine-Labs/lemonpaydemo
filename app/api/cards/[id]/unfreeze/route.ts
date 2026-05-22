import { type NextRequest, type NextResponse } from "next/server";
import { unfreezeCard } from "@/lib/card-provider";
import { adminDb } from "@/lib/firebase-admin";
import {
  effectiveUid,
  jsonErr,
  jsonOk,
  loadCardForActor,
  logApiCall,
  requireAuth,
} from "@/lib/api-helpers";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const t0 = Date.now();
  const { id: cardId } = await ctx.params;
  const endpoint = `/api/cards/${cardId}/unfreeze`;
  let uid: string | null = null;

  const handle = async (): Promise<NextResponse> => {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonErr(auth.error, auth.status);
    uid = effectiveUid(auth.auth);

    const card = await loadCardForActor(cardId, auth.auth);
    if (!card.ok) return jsonErr(card.error, card.status);

    if (card.cardData.status === "active") {
      return jsonOk({ card_id: cardId, status: "active", already: true });
    }
    if (card.cardData.status === "terminated") {
      return jsonErr(
        { code: "card_terminated", message: "Cannot unfreeze a terminated card" },
        409,
      );
    }

    const providerId = String(card.cardData.flutterwave_card_id ?? "");
    const provider = await unfreezeCard(providerId);
    if (!provider.ok) {
      return jsonErr({ code: "provider_error", message: provider.error.message }, 502);
    }

    await adminDb.collection("cards").doc(cardId).update({
      status: "active",
      frozen_at: null,
    });

    return jsonOk({ card_id: cardId, status: "active" });
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
