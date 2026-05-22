/**
 * Reusable seed runner. Exported so both the CLI (`npm run seed`) and the
 * /api/admin/demo-reset route can wipe + re-seed without spawning a
 * subprocess (Cloud Run has no `npm` binary at runtime).
 */

import { adminDb } from "../lib/firebase-admin";
import { COLLECTIONS } from "../lib/types";
import { seedCustomers, CUSTOMERS } from "./customers";
import { seedSpecialtyFor } from "./specialty";
import { seedTransactionsFor } from "./transactions";

const WIPED_COLLECTIONS: string[] = [
  COLLECTIONS.users,
  COLLECTIONS.accounts,
  COLLECTIONS.cards,
  COLLECTIONS.transactions,
  COLLECTIONS.merchant_locks,
  COLLECTIONS.kyc_attempts,
  COLLECTIONS.disputes,
  COLLECTIONS.limit_requests,
  COLLECTIONS.emails,
  COLLECTIONS.otp_codes,
  // Idempotency cache too — otherwise reused keys after a reset return stale
  // responses pointing at deleted documents.
  "idempotency_keys",
];

export interface SeedReport {
  duration_ms: number;
  wiped: Record<string, number>;
  customers: { handle: string; uid: string; email: string }[];
  transactions_seeded: number;
}

export interface RunSeedOptions {
  wipe?: boolean;
  log?: (msg: string) => void;
}

export async function runSeed(opts: RunSeedOptions = {}): Promise<SeedReport> {
  const wipe = opts.wipe !== false;
  const log = opts.log ?? (() => {});
  const t0 = Date.now();

  const wiped: Record<string, number> = {};
  if (wipe) {
    log("Wiping existing data...");
    for (const col of WIPED_COLLECTIONS) {
      const n = await wipeCollection(col);
      wiped[col] = n;
      if (n > 0) log(`  - cleared ${n} docs from ${col}`);
    }
  }

  log("Seeding customers...");
  const seeded = await seedCustomers();

  log("Seeding transactions...");
  let txCount = 0;
  for (const customer of seeded) {
    const before = await adminDb
      .collection(COLLECTIONS.transactions)
      .where("user_id", "==", customer.uid)
      .count()
      .get();
    await seedTransactionsFor(customer);
    const after = await adminDb
      .collection(COLLECTIONS.transactions)
      .where("user_id", "==", customer.uid)
      .count()
      .get();
    txCount += after.data().count - before.data().count;
  }

  log("Seeding specialty data...");
  for (const customer of seeded) {
    await seedSpecialtyFor(customer);
  }

  return {
    duration_ms: Date.now() - t0,
    wiped,
    customers: seeded.map((c) => ({ handle: c.handle, uid: c.uid, email: c.email })),
    transactions_seeded: txCount,
  };
}

export function getSeedCustomerSummary() {
  return CUSTOMERS.map((c) => ({
    handle: c.handle,
    email: c.email,
    full_name: c.user.full_name,
    status: c.user.status,
  }));
}

async function wipeCollection(name: string): Promise<number> {
  const snap = await adminDb.collection(name).get();
  if (snap.empty) return 0;
  let deleted = 0;
  let batch = adminDb.batch();
  let i = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    i++;
    if (i % 450 === 0) {
      await batch.commit();
      batch = adminDb.batch();
    }
    deleted++;
  }
  if (i % 450 !== 0) await batch.commit();
  return deleted;
}
