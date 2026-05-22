/**
 * Run the demo seed end to end.
 *
 *   npm run seed         → wipes user-scoped data then re-seeds
 *   npm run seed -- --no-wipe → re-seed without wiping
 *
 * Requires .env.local to be loaded (npm script uses --env-file=.env.local).
 */

import { adminDb } from "../lib/firebase-admin";
import { COLLECTIONS } from "../lib/types";
import { seedCustomers, CUSTOMERS } from "./customers";
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
];

async function main() {
  const wipe = !process.argv.includes("--no-wipe");
  const t0 = Date.now();

  console.log(`Project: ${process.env.FIREBASE_ADMIN_PROJECT_ID}`);
  console.log(`Customers to seed: ${CUSTOMERS.map((c) => c.handle).join(", ")}`);
  console.log("");

  if (wipe) {
    console.log("Wiping existing data...");
    for (const col of WIPED_COLLECTIONS) {
      const n = await wipeCollection(col);
      if (n > 0) console.log(`  - cleared ${n} docs from ${col}`);
    }
    console.log("");
  } else {
    console.log("Skipping wipe (--no-wipe).");
    console.log("");
  }

  console.log("Seeding customers...");
  const seeded = await seedCustomers();
  console.log("");

  console.log("Seeding transactions...");
  for (const customer of seeded) {
    await seedTransactionsFor(customer);
  }
  console.log("");

  const dt = Date.now() - t0;
  console.log(`Done in ${dt}ms.`);
  console.log("");
  console.log("Login credentials:");
  for (const c of CUSTOMERS) {
    console.log(`  ${c.handle.padEnd(8)} ${c.email}  password: ${c.password}`);
  }
}

async function wipeCollection(name: string): Promise<number> {
  const snap = await adminDb.collection(name).get();
  if (snap.empty) return 0;
  // Firestore batches max 500 writes.
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

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
