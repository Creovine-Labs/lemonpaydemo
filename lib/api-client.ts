"use client";

import { auth } from "./firebase-client";

/**
 * Tiny client-side helper for calling our own /api/* endpoints with the
 * current Firebase Auth user's ID token. Returns the parsed `{ok, data}` /
 * `{ok, error}` envelope.
 */

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string } };
export type ApiEnvelope<T> = ApiOk<T> | ApiErr;

interface PostOpts {
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiPost<T>(
  path: string,
  opts: PostOpts = {},
): Promise<ApiEnvelope<T>> {
  const user = auth.currentUser;
  if (!user) {
    return {
      ok: false,
      error: { code: "no_session", message: "You must be signed in" },
    };
  }
  const token = await user.getIdToken();

  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(opts.headers ?? {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : "{}",
    });
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "network_error",
        message: err instanceof Error ? err.message : "Network error",
      },
    };
  }

  try {
    return (await res.json()) as ApiEnvelope<T>;
  } catch {
    return {
      ok: false,
      error: { code: "invalid_response", message: `Non-JSON response (${res.status})` },
    };
  }
}
