/**
 * Mock card provider. Replaces the Flutterwave virtual-card integration the
 * spec called for, because Flutterwave discontinued virtual-card issuance.
 *
 * All operations succeed unless the caller hits an obviously invalid state
 * (e.g. terminating a card that doesn't exist in our tracking map). The data
 * shape mirrors what a real issuer would return so Phase 4 endpoints can be
 * written against this interface and later swapped to a real provider.
 *
 * Server-only. Holds a small in-memory map of cards we've issued so freeze /
 * unfreeze / terminate can return coherent state in a single process. The
 * source of truth for the app is Firestore — this module is just a stand-in
 * for the external provider.
 */

import crypto from "node:crypto";

export type ProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export type ProviderCardStatus = "active" | "frozen" | "terminated";

export interface ProviderCard {
  /** Provider's card ID (returned by `createCard`, used in subsequent calls). */
  id: string;
  pan: string; // full PAN, mock-generated
  masked_pan: string; // e.g. "411111******4242"
  last4: string;
  cvv: string;
  expiry_month: number;
  expiry_year: number;
  brand: "visa" | "mastercard";
  name_on_card: string;
  status: ProviderCardStatus;
  created_at: string;
  frozen_at: string | null;
  terminated_at: string | null;
}

const CARDS = new Map<string, ProviderCard>();

export interface CreateCardInput {
  holder_name: string;
  email: string;
  /** Optional last4 override so seeded cards keep their stable last4. */
  preferred_last4?: string;
}

export function createCard(input: CreateCardInput): Promise<ProviderResult<ProviderCard>> {
  const last4 = input.preferred_last4 ?? randomDigits(4);
  const pan = `4111${randomDigits(8)}${last4}`; // valid-ish Visa BIN
  const id = `mcp_${crypto.randomUUID().slice(0, 12)}`;
  const now = new Date();
  const card: ProviderCard = {
    id,
    pan,
    masked_pan: `${pan.slice(0, 6)}******${last4}`,
    last4,
    cvv: randomDigits(3),
    expiry_month: 11,
    expiry_year: now.getUTCFullYear() + 3,
    brand: "visa",
    name_on_card: input.holder_name.toUpperCase().slice(0, 26),
    status: "active",
    created_at: now.toISOString(),
    frozen_at: null,
    terminated_at: null,
  };
  CARDS.set(id, card);
  return Promise.resolve({ ok: true, data: card });
}

export function getCard(id: string): Promise<ProviderResult<ProviderCard>> {
  const card = CARDS.get(id);
  if (!card) {
    return Promise.resolve({
      ok: false,
      error: { code: "card_not_found", message: `Card ${id} not in mock provider state` },
    });
  }
  return Promise.resolve({ ok: true, data: card });
}

export function freezeCard(id: string): Promise<ProviderResult<ProviderCard>> {
  return updateCard(id, "freeze");
}

export function unfreezeCard(id: string): Promise<ProviderResult<ProviderCard>> {
  return updateCard(id, "unfreeze");
}

export function terminateCard(id: string): Promise<ProviderResult<ProviderCard>> {
  return updateCard(id, "terminate");
}

function updateCard(
  id: string,
  op: "freeze" | "unfreeze" | "terminate",
): Promise<ProviderResult<ProviderCard>> {
  const card = CARDS.get(id);
  if (!card) {
    // Allow operations on cards we don't know about (the in-process Map
    // resets between server restarts; Firestore is the source of truth).
    // Synthesize a minimal card so callers still get a coherent response.
    const synthetic: ProviderCard = {
      id,
      pan: "************0000",
      masked_pan: "************0000",
      last4: "0000",
      cvv: "000",
      expiry_month: 1,
      expiry_year: new Date().getUTCFullYear() + 3,
      brand: "visa",
      name_on_card: "UNKNOWN",
      status: op === "terminate" ? "terminated" : op === "freeze" ? "frozen" : "active",
      created_at: new Date().toISOString(),
      frozen_at: op === "freeze" ? new Date().toISOString() : null,
      terminated_at: op === "terminate" ? new Date().toISOString() : null,
    };
    CARDS.set(id, synthetic);
    return Promise.resolve({ ok: true, data: synthetic });
  }
  if (card.status === "terminated") {
    return Promise.resolve({
      ok: false,
      error: { code: "card_terminated", message: "Card is terminated; cannot modify" },
    });
  }
  if (op === "freeze") {
    card.status = "frozen";
    card.frozen_at = new Date().toISOString();
  } else if (op === "unfreeze") {
    card.status = "active";
    card.frozen_at = null;
  } else {
    card.status = "terminated";
    card.terminated_at = new Date().toISOString();
  }
  return Promise.resolve({ ok: true, data: card });
}

// ---------- Refunds ----------

export interface ProviderRefund {
  id: string;
  tx_ref: string;
  amount_rwf: number;
  status: "completed";
  created_at: string;
}

export function createRefund(input: {
  tx_ref: string;
  amount_rwf: number;
}): Promise<ProviderResult<ProviderRefund>> {
  return Promise.resolve({
    ok: true,
    data: {
      id: `mrf_${crypto.randomUUID().slice(0, 12)}`,
      tx_ref: input.tx_ref,
      amount_rwf: input.amount_rwf,
      status: "completed",
      created_at: new Date().toISOString(),
    },
  });
}

// ---------- Disputes / chargebacks ----------

export interface ProviderDispute {
  id: string;
  tx_ref: string;
  amount_rwf: number;
  status: "filed";
  provisional_credit_amount_rwf: number;
  created_at: string;
}

export function fileDispute(input: {
  tx_ref: string;
  amount_rwf: number;
}): Promise<ProviderResult<ProviderDispute>> {
  return Promise.resolve({
    ok: true,
    data: {
      id: `mdp_${crypto.randomUUID().slice(0, 12)}`,
      tx_ref: input.tx_ref,
      amount_rwf: input.amount_rwf,
      status: "filed",
      // Provisional credit = full amount, mirrors real-world chargeback flows.
      provisional_credit_amount_rwf: input.amount_rwf,
      created_at: new Date().toISOString(),
    },
  });
}

function randomDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += String(crypto.randomInt(0, 10));
  return s;
}
