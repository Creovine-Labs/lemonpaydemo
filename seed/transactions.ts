import { adminDb, Timestamp } from "../lib/firebase-admin";
import { COLLECTIONS } from "../lib/types";
import type { SeededCustomer } from "./customers";

/**
 * Seed Lola's transaction history. Three buckets:
 *   1. ~30 normal historical transactions over the past 60 days.
 *   2. Two identical Simba Supermarket charges of RWF 115,000 (Scene 2).
 *   3. One suspicious AliExpress charge of RWF 1,620,000 at 03:00 UTC (Scene 3).
 *   4. One pending grocery authorization for today (Scene 1).
 *
 * The output is deterministic: the same merchants land on the same day offsets
 * every run.
 */

interface SeedMerchant {
  id: string;
  name: string;
  category: string;
  typicalAmounts: number[];
}

const MERCHANTS: SeedMerchant[] = [
  { id: "simba_supermarket", name: "Simba Supermarket", category: "Groceries", typicalAmounts: [12500, 28400, 45200, 67800, 115000] },
  { id: "java_house", name: "Java House Kigali", category: "Restaurants", typicalAmounts: [4800, 7200, 9500, 12000] },
  { id: "bourbon_coffee", name: "Bourbon Coffee", category: "Restaurants", typicalAmounts: [3200, 4500, 6800] },
  { id: "mtn_airtime", name: "MTN Airtime", category: "Subscriptions", typicalAmounts: [2000, 5000, 10000] },
  { id: "uber_kigali", name: "Uber", category: "Travel", typicalAmounts: [2400, 3600, 4800, 6200] },
  { id: "kigali_heights_eats", name: "Kigali Heights Eats", category: "Restaurants", typicalAmounts: [8500, 14200, 18900] },
  { id: "rubis_fuel", name: "Rubis Energy", category: "Fuel", typicalAmounts: [15000, 22500, 30000] },
  { id: "netflix", name: "Netflix", category: "Subscriptions", typicalAmounts: [10800] },
];

// Deterministic 30-day distribution: which merchant on which day offset.
const HISTORICAL_PATTERN: Array<{ daysAgo: number; merchantIdx: number; amountIdx: number; hour: number }> = [
  { daysAgo: 1,  merchantIdx: 1, amountIdx: 1, hour: 8 },
  { daysAgo: 1,  merchantIdx: 4, amountIdx: 0, hour: 18 },
  { daysAgo: 2,  merchantIdx: 0, amountIdx: 1, hour: 17 },
  { daysAgo: 2,  merchantIdx: 2, amountIdx: 0, hour: 9 },
  { daysAgo: 3,  merchantIdx: 5, amountIdx: 1, hour: 13 },
  { daysAgo: 4,  merchantIdx: 4, amountIdx: 2, hour: 21 },
  { daysAgo: 5,  merchantIdx: 0, amountIdx: 2, hour: 16 },
  { daysAgo: 5,  merchantIdx: 1, amountIdx: 2, hour: 12 },
  { daysAgo: 6,  merchantIdx: 6, amountIdx: 1, hour: 7 },
  { daysAgo: 7,  merchantIdx: 3, amountIdx: 1, hour: 10 },
  { daysAgo: 8,  merchantIdx: 5, amountIdx: 2, hour: 20 },
  { daysAgo: 9,  merchantIdx: 1, amountIdx: 0, hour: 8 },
  { daysAgo: 10, merchantIdx: 7, amountIdx: 0, hour: 23 },
  { daysAgo: 11, merchantIdx: 4, amountIdx: 1, hour: 19 },
  { daysAgo: 12, merchantIdx: 0, amountIdx: 0, hour: 17 },
  { daysAgo: 14, merchantIdx: 6, amountIdx: 2, hour: 7 },
  { daysAgo: 15, merchantIdx: 2, amountIdx: 1, hour: 11 },
  { daysAgo: 17, merchantIdx: 5, amountIdx: 0, hour: 12 },
  { daysAgo: 19, merchantIdx: 1, amountIdx: 3, hour: 13 },
  { daysAgo: 21, merchantIdx: 0, amountIdx: 3, hour: 16 },
  { daysAgo: 23, merchantIdx: 4, amountIdx: 3, hour: 22 },
  { daysAgo: 25, merchantIdx: 3, amountIdx: 2, hour: 9 },
  { daysAgo: 27, merchantIdx: 5, amountIdx: 1, hour: 19 },
  { daysAgo: 30, merchantIdx: 6, amountIdx: 0, hour: 7 },
  { daysAgo: 33, merchantIdx: 1, amountIdx: 2, hour: 8 },
  { daysAgo: 36, merchantIdx: 0, amountIdx: 1, hour: 17 },
  { daysAgo: 40, merchantIdx: 2, amountIdx: 2, hour: 10 },
  { daysAgo: 44, merchantIdx: 4, amountIdx: 0, hour: 18 },
  { daysAgo: 50, merchantIdx: 5, amountIdx: 2, hour: 13 },
  { daysAgo: 58, merchantIdx: 0, amountIdx: 2, hour: 16 },
];

export async function seedTransactionsFor(customer: SeededCustomer): Promise<void> {
  if (customer.handle !== "lola") {
    // Other customers get their transactions in Phase 5.
    return;
  }
  if (!customer.cardId) {
    throw new Error(`Customer ${customer.handle} has no cardId — cannot seed transactions`);
  }

  const batch = adminDb.batch();
  const txCol = adminDb.collection(COLLECTIONS.transactions);
  let count = 0;

  // 1. Historical transactions.
  for (const entry of HISTORICAL_PATTERN) {
    const m = MERCHANTS[entry.merchantIdx];
    const amount = m.typicalAmounts[entry.amountIdx];
    const date = daysAgoAt(entry.daysAgo, entry.hour, 30);

    batch.set(txCol.doc(), {
      user_id: customer.uid,
      card_id: customer.cardId,
      flutterwave_tx_ref: `seed_${m.id}_${entry.daysAgo}`,
      merchant_name: m.name,
      merchant_id: m.id,
      merchant_category: m.category,
      amount_rwf: amount,
      currency: "RWF",
      status: "posted",
      type: "purchase",
      posted_at: Timestamp.fromDate(date),
      metadata: { source: "seed" },
    });
    count++;
  }

  // 2. Two identical Simba Supermarket charges of RWF 115,000 — yesterday, 90s apart.
  const dupBase = daysAgoAt(1, 14, 22);
  for (let i = 0; i < 2; i++) {
    const at = new Date(dupBase.getTime() + i * 90_000);
    batch.set(txCol.doc(), {
      user_id: customer.uid,
      card_id: customer.cardId,
      flutterwave_tx_ref: `seed_simba_dup_${i}`,
      merchant_name: "Simba Supermarket",
      merchant_id: "simba_supermarket",
      merchant_category: "Groceries",
      amount_rwf: 115_000,
      currency: "RWF",
      status: "posted",
      type: "purchase",
      posted_at: Timestamp.fromDate(at),
      metadata: { source: "seed", scene: "duplicate_charge" },
    });
    count++;
  }

  // 3. Suspicious AliExpress charge, 03:00 UTC two days ago.
  const fraudDate = daysAgoAt(2, 3, 0);
  batch.set(txCol.doc(), {
    user_id: customer.uid,
    card_id: customer.cardId,
    flutterwave_tx_ref: "seed_aliexpress_fraud",
    merchant_name: "AliExpress",
    merchant_id: "aliexpress",
    merchant_category: "Online shopping",
    amount_rwf: 1_620_000,
    currency: "RWF",
    status: "posted",
    type: "purchase",
    posted_at: Timestamp.fromDate(fraudDate),
    metadata: {
      source: "seed",
      scene: "fraud_dispute",
      device_fingerprint: "unknown_device_8f2c",
      geo: "Shenzhen, CN",
    },
  });
  count++;

  // 4. Pending grocery authorization for today (the Scene 1 decline).
  const pendingDate = daysAgoAt(0, 12, 0);
  batch.set(txCol.doc(), {
    user_id: customer.uid,
    card_id: customer.cardId,
    flutterwave_tx_ref: "seed_simba_pending_decline",
    merchant_name: "Simba Supermarket",
    merchant_id: "simba_supermarket",
    merchant_category: "Groceries",
    amount_rwf: 38_400,
    currency: "RWF",
    status: "declined",
    type: "purchase",
    posted_at: Timestamp.fromDate(pendingDate),
    metadata: { source: "seed", scene: "card_decline", decline_reason: "merchant_locked" },
  });
  count++;

  await batch.commit();
  console.log(`  ✓ lola      seeded ${count} transactions`);
}

function daysAgoAt(daysAgo: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}
