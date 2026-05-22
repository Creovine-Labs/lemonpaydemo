import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodSchema } from "zod";
import { adminAuth, adminDb, FieldValue, Timestamp } from "./firebase-admin";

/**
 * Shared helpers used by every /api/* route.
 *
 *   - requireAuth(req)        — verify Firebase ID token OR Lira service token
 *   - requireBody(req, sch)   — parse JSON, validate against a Zod schema
 *   - withIdempotency(...)    — cache once-per-key responses for retries
 *   - jsonOk / jsonErr        — typed NextResponse wrappers
 *   - logApiCall(...)         — fire-and-forget write to api_logs (PII-redacted)
 *
 * The endpoint contract (spec §7):
 *   - Auth: every endpoint except /api/webhooks/* requires a bearer token
 *   - Validation: Zod schema on every body
 *   - Response: { ok: true, data } | { ok: false, error: { code, message } }
 *   - Idempotency: money-moving endpoints accept an Idempotency-Key header
 *   - Logging: every call writes to Firestore api_logs
 */

// ---------- Response helpers ----------

export interface ApiError {
  code: string;
  message: string;
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonErr(error: ApiError, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

// ---------- Auth ----------

export type AuthContext =
  | { kind: "customer"; uid: string }
  | { kind: "lira"; actingAs: string };

export type AuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; status: number; error: ApiError };

/**
 * Verifies the request. Three accepted forms:
 *
 *   1. Customer: `Authorization: Bearer <firebase-id-token>`
 *   2. Lira:    `Authorization: Bearer <LIRA_SHARED_SECRET>` plus
 *               `X-Acting-As: <uid>` so the action is attributed correctly
 *   3. (None)   → 401
 *
 * The customer path is the common one. Lira uses path 2 when its backend
 * calls our endpoints on a user's behalf (Scene 1 unlock, refund approval,
 * dispute filing, etc.).
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      ok: false,
      status: 401,
      error: { code: "unauthenticated", message: "Missing bearer token" },
    };
  }
  const token = match[1]!;

  const liraSecret = process.env.LIRA_SHARED_SECRET;
  if (liraSecret && token === liraSecret) {
    const actingAs = req.headers.get("x-acting-as");
    if (!actingAs) {
      return {
        ok: false,
        status: 400,
        error: {
          code: "missing_acting_as",
          message: "Lira requests must include X-Acting-As header",
        },
      };
    }
    return { ok: true, auth: { kind: "lira", actingAs } };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { ok: true, auth: { kind: "customer", uid: decoded.uid } };
  } catch {
    return {
      ok: false,
      status: 401,
      error: { code: "invalid_token", message: "Firebase ID token is invalid or expired" },
    };
  }
}

/** UID the action should be attributed to (customer's own UID, or Lira's acting-as). */
export function effectiveUid(auth: AuthContext): string {
  return auth.kind === "customer" ? auth.uid : auth.actingAs;
}

// ---------- Body parsing + validation ----------

export type BodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: ApiError };

export async function requireBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<BodyResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      status: 400,
      error: { code: "invalid_json", message: "Body is not valid JSON" },
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: {
        code: "invalid_body",
        message: z.prettifyError(parsed.error),
      },
    };
  }
  return { ok: true, data: parsed.data };
}

// ---------- Idempotency ----------

/**
 * Run `op` exactly once per Idempotency-Key. On retry with the same key,
 * returns the cached response. Keys are namespaced by `scope` so two
 * different endpoints with the same client-side key don't collide.
 *
 * Cache TTL is 24h (Firestore TTL feature not configured here; we just
 * leave docs in place — they're cheap).
 */
export async function withIdempotency<T>(
  req: NextRequest,
  scope: string,
  op: () => Promise<T>,
): Promise<
  | { kind: "fresh"; data: T }
  | { kind: "replay"; data: T }
  | { kind: "missing_key"; error: ApiError }
> {
  const key = req.headers.get("idempotency-key");
  if (!key) {
    return {
      kind: "missing_key",
      error: { code: "missing_idempotency_key", message: "Idempotency-Key header required" },
    };
  }

  const docId = `${scope}__${hashKey(key)}`;
  const ref = adminDb.collection("idempotency_keys").doc(docId);

  const existing = await ref.get();
  if (existing.exists) {
    const data = existing.data() as { result: T };
    return { kind: "replay", data: data.result };
  }

  const result = await op();
  await ref.set({
    scope,
    key,
    result,
    created_at: FieldValue.serverTimestamp(),
  });
  return { kind: "fresh", data: result };
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 32);
}

// ---------- Audit logging ----------

interface LogInput {
  endpoint: string;
  method: string;
  uid?: string | null;
  statusCode: number;
  durationMs: number;
  error?: string | null;
}

/**
 * Fire-and-forget audit log entry. Errors are swallowed — logging must
 * never break a request.
 */
export function logApiCall(input: LogInput): void {
  void adminDb
    .collection("api_logs")
    .add({
      endpoint: input.endpoint,
      method: input.method,
      user_id: input.uid ?? null,
      status_code: input.statusCode,
      request_id: crypto.randomUUID(),
      duration_ms: input.durationMs,
      error: input.error ?? null,
      created_at: FieldValue.serverTimestamp(),
    })
    .catch((err: unknown) => {
      console.error("api_logs write failed:", err);
    });
}

/**
 * Convenience wrapper for the common pattern:
 *   const t0 = Date.now();
 *   try { ... } finally { logApiCall({ ..., durationMs: Date.now()-t0 }); }
 */
export async function withLogging<R>(
  endpoint: string,
  method: string,
  uid: string | null,
  fn: () => Promise<{ response: NextResponse; result: R }>,
): Promise<NextResponse> {
  const t0 = Date.now();
  let status = 500;
  let errorMsg: string | null = null;
  try {
    const { response } = await fn();
    status = response.status;
    return response;
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    logApiCall({
      endpoint,
      method,
      uid,
      statusCode: status,
      durationMs: Date.now() - t0,
      error: errorMsg,
    });
  }
}

// ---------- Card ownership helper (used by /api/cards/* endpoints) ----------

export type CardCheckResult =
  | { ok: true; cardData: FirebaseFirestore.DocumentData & { user_id: string } }
  | { ok: false; status: number; error: ApiError };

export async function loadCardForActor(
  cardId: string,
  auth: AuthContext,
): Promise<CardCheckResult> {
  const snap = await adminDb.collection("cards").doc(cardId).get();
  if (!snap.exists) {
    return {
      ok: false,
      status: 404,
      error: { code: "card_not_found", message: `Card ${cardId} not found` },
    };
  }
  const data = snap.data() as FirebaseFirestore.DocumentData & { user_id: string };
  const allowedUid = effectiveUid(auth);
  if (data.user_id !== allowedUid) {
    return {
      ok: false,
      status: 403,
      error: { code: "forbidden", message: "Card does not belong to the caller" },
    };
  }
  return { ok: true, cardData: data };
}

// Re-export sentinels used by route handlers.
export { FieldValue, Timestamp };
