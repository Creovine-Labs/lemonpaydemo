import { type NextRequest, NextResponse } from "next/server";
import { jsonErr, jsonOk, logApiCall } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase-admin";
import { demoResetBody } from "@/lib/schemas";
import { COLLECTIONS } from "@/lib/types";
import { runSeed } from "@/seed/runner";

/**
 * Wipes user-scoped Firestore data and re-seeds. Token-gated by
 * DEMO_RESET_TOKEN — not a Firebase ID token, a static secret shared
 * between the salesperson's reset UI and this endpoint.
 *
 * Two scopes:
 *   { scope: "all" }                → wipe everything, re-seed all customers
 *   { scope: "user", user_id: "…" } → wipe one user's docs only
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const endpoint = `/api/admin/demo-reset`;

  const handle = async (): Promise<NextResponse> => {
    const expected = process.env.DEMO_RESET_TOKEN;
    if (!expected) {
      return jsonErr(
        { code: "not_configured", message: "DEMO_RESET_TOKEN not set on server" },
        500,
      );
    }
    const header = req.headers.get("authorization") ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match || match[1] !== expected) {
      return jsonErr({ code: "unauthorized", message: "Bad demo reset token" }, 401);
    }

    let body: { scope: "all" | "user"; user_id?: string } = { scope: "all" };
    try {
      const raw = await req.text();
      if (raw.trim().length > 0) {
        const parsed = demoResetBody.safeParse(JSON.parse(raw));
        if (!parsed.success) {
          return jsonErr({ code: "invalid_body", message: parsed.error.message }, 400);
        }
        body = parsed.data;
      }
    } catch {
      return jsonErr({ code: "invalid_json", message: "Body is not JSON" }, 400);
    }

    if (body.scope === "user") {
      const uid = body.user_id;
      if (!uid) {
        return jsonErr(
          { code: "missing_user_id", message: "user_id required for scope=user" },
          400,
        );
      }
      const cleared = await wipeForUser(uid);
      return jsonOk({
        reset_at: new Date().toISOString(),
        scope: "user",
        user_id: uid,
        cleared,
      });
    }

    try {
      const report = await runSeed({ wipe: true });
      return jsonOk({
        reset_at: new Date().toISOString(),
        scope: "all",
        duration_ms: report.duration_ms,
        wiped: report.wiped,
        customers: report.customers,
        transactions_seeded: report.transactions_seeded,
      });
    } catch (err) {
      return jsonErr(
        {
          code: "seed_failed",
          message: err instanceof Error ? err.message : "Seed crashed",
        },
        500,
      );
    }
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

async function wipeForUser(uid: string): Promise<Record<string, number>> {
  const userScoped: string[] = [
    COLLECTIONS.accounts,
    COLLECTIONS.cards,
    COLLECTIONS.transactions,
    COLLECTIONS.merchant_locks,
    COLLECTIONS.kyc_attempts,
    COLLECTIONS.disputes,
    COLLECTIONS.limit_requests,
    COLLECTIONS.emails,
    COLLECTIONS.otp_codes,
  ];
  const cleared: Record<string, number> = {};
  for (const col of userScoped) {
    const snap = await adminDb.collection(col).where("user_id", "==", uid).get();
    if (snap.empty) {
      cleared[col] = 0;
      continue;
    }
    const batch = adminDb.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    cleared[col] = snap.size;
  }
  return cleared;
}
