/**
 * Flutterwave v3 REST wrapper. Server-only — never import from client code.
 *
 * Scope (spec §10.1):
 *   - Virtual Cards: create, get, block, unblock, terminate
 *   - Refunds: create
 *   - Chargebacks: file
 *
 * Auth is header `Authorization: Bearer ${FLW_SECRET_KEY}` (use the
 * FLWSECK_TEST-… key throughout the demo). Webhook signature verification
 * for inbound events lives in /api/webhooks/flutterwave.
 */

const BASE_URL = "https://api.flutterwave.com/v3";

export type FlwResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; status?: number } };

interface RawResponse<T> {
  status: "success" | "error";
  message: string;
  data?: T;
}

function getSecretKey(): string {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) {
    throw new Error(
      "FLW_SECRET_KEY not set. Add it to .env.local (use the FLWSECK_TEST-… key for the demo).",
    );
  }
  return key;
}

async function flw<T>(
  path: string,
  init: { method: "GET" | "POST" | "PUT"; body?: unknown } = { method: "GET" },
): Promise<FlwResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        "Content-Type": "application/json",
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
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

  let payload: RawResponse<T>;
  try {
    payload = (await res.json()) as RawResponse<T>;
  } catch {
    return {
      ok: false,
      error: {
        code: "invalid_response",
        message: `Non-JSON response (${res.status})`,
        status: res.status,
      },
    };
  }

  if (!res.ok || payload.status !== "success") {
    return {
      ok: false,
      error: {
        code: res.ok ? "flutterwave_error" : `http_${res.status}`,
        message: payload.message ?? "Flutterwave request failed",
        status: res.status,
      },
    };
  }

  return { ok: true, data: payload.data as T };
}

// ---------- Virtual Cards ----------

export interface VirtualCard {
  id: string; // Flutterwave card id (use for follow-up calls)
  account_id: number;
  amount: string;
  currency: string;
  card_hash: string;
  card_pan: string;
  masked_pan: string;
  city: string;
  state: string;
  address_1: string;
  zip_code: string;
  cvv: string;
  expiration: string; // e.g. "11/28"
  name_on_card: string;
  is_active: boolean;
  callback_url: string | null;
  created_at: string;
}

export interface CreateVirtualCardInput {
  currency: "RWF" | "USD" | "NGN";
  amount: number;
  billing_name: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  billing_country: "RW" | "US" | "NG" | string;
  first_name: string;
  last_name: string;
  date_of_birth: string; // YYYY-MM-DD
  email: string;
  phone: string;
  title?: "Mr" | "Mrs" | "Miss" | "Dr";
  gender?: "M" | "F";
}

export function createVirtualCard(
  input: CreateVirtualCardInput,
): Promise<FlwResult<VirtualCard>> {
  return flw<VirtualCard>("/virtual-cards", { method: "POST", body: input });
}

export function getVirtualCard(
  cardId: string,
): Promise<FlwResult<VirtualCard>> {
  return flw<VirtualCard>(`/virtual-cards/${cardId}`);
}

export function freezeVirtualCard(
  cardId: string,
): Promise<FlwResult<VirtualCard>> {
  return flw<VirtualCard>(`/virtual-cards/${cardId}/status/block`, {
    method: "PUT",
  });
}

export function unfreezeVirtualCard(
  cardId: string,
): Promise<FlwResult<VirtualCard>> {
  return flw<VirtualCard>(`/virtual-cards/${cardId}/status/unblock`, {
    method: "PUT",
  });
}

export function terminateVirtualCard(
  cardId: string,
): Promise<FlwResult<VirtualCard>> {
  return flw<VirtualCard>(`/virtual-cards/${cardId}/terminate`, {
    method: "PUT",
  });
}

// ---------- Refunds ----------

export interface Refund {
  id: number;
  account_id: number;
  tx_id: number;
  flw_ref: string;
  wallet_id: number;
  amount_refunded: number;
  status: "pending" | "completed" | "failed";
  destination: string;
  meta: unknown;
  created_at: string;
}

/**
 * Refund a Flutterwave transaction by its `tx_id` (NOT our internal
 * transactions/{id}). For the demo we pass the seeded `flutterwave_tx_ref`
 * → we'll look up the underlying numeric tx_id when needed in Phase 4.
 */
export function createRefund(input: {
  tx_id: string | number;
  amount: number;
}): Promise<FlwResult<Refund>> {
  return flw<Refund>("/refunds", {
    method: "POST",
    body: { id: input.tx_id, amount: input.amount },
  });
}

// ---------- Chargebacks ----------

export interface Chargeback {
  id: number;
  tx_id: number;
  amount: number;
  status: "accepted" | "declined" | "pending";
  resolution: string | null;
  meta: unknown;
  created_at: string;
}

export function acceptChargeback(input: {
  tx_id: string | number;
  comment?: string;
}): Promise<FlwResult<Chargeback>> {
  return flw<Chargeback>(`/chargebacks/${input.tx_id}/accept`, {
    method: "POST",
    body: input.comment ? { comment: input.comment } : {},
  });
}
