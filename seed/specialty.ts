import { adminDb, FieldValue, Timestamp } from "../lib/firebase-admin";
import { COLLECTIONS } from "../lib/types";
import type { SeededCustomer } from "./customers";

/**
 * Per-customer specialty seeds: things that only one of the demo personas
 * needs (Marcus's failed KYC attempt, Priya's pending limit request, an
 * inbox starter thread for Lola so Scene 3 has somewhere to anchor).
 */

export async function seedSpecialtyFor(customer: SeededCustomer): Promise<void> {
  switch (customer.handle) {
    case "marcus":
      await seedMarcusFailedKyc(customer);
      break;
    case "priya":
      await seedPriyaLimitRequest(customer);
      break;
    case "lola":
      await seedLolaInbox(customer);
      break;
    default:
      // Background customers have no specialty rows yet.
      break;
  }
}

async function seedMarcusFailedKyc(c: SeededCustomer) {
  const ref = adminDb.collection(COLLECTIONS.kyc_attempts).doc();
  const submittedAt = new Date();
  submittedAt.setUTCDate(submittedAt.getUTCDate() - 1);
  await ref.set({
    user_id: c.uid,
    attempt_number: 1,
    id_image_path: `kyc/${c.uid}/seed_attempt_1/id_front.jpg`,
    selfie_image_path: `kyc/${c.uid}/seed_attempt_1/selfie.jpg`,
    status: "failed",
    failure_reason: "glare_on_dob",
    submitted_at: Timestamp.fromDate(submittedAt),
    resolved_at: Timestamp.fromDate(submittedAt),
  });
  console.log(`  ✓ marcus    seeded failed KYC attempt (glare_on_dob)`);
}

async function seedPriyaLimitRequest(c: SeededCustomer) {
  const ref = adminDb.collection(COLLECTIONS.limit_requests).doc();
  await ref.set({
    user_id: c.uid,
    type: "daily_spend",
    current_limit_rwf: 500_000,
    requested_limit_rwf: 2_000_000,
    status: "pending",
    decision_reason: null,
    created_at: FieldValue.serverTimestamp(),
  });
  console.log(`  ✓ priya     seeded pending limit_request (daily_spend 500K → 2M)`);
}

async function seedLolaInbox(c: SeededCustomer) {
  // A single inbound "welcome" thread so the inbox isn't empty on first view.
  const ref = adminDb.collection(COLLECTIONS.emails).doc();
  const sentAt = new Date();
  sentAt.setUTCDate(sentAt.getUTCDate() - 3);
  await ref.set({
    user_id: c.uid,
    direction: "inbound",
    thread_id: `welcome_${c.uid}`,
    from: "support@lemonpay.rw",
    to: c.email,
    subject: "Welcome to Lemonpay",
    body: [
      "Hi Lola,",
      "",
      "Thanks for joining Lemonpay. Your account is fully verified and your virtual card is ready to use.",
      "",
      "Need anything? Just reply to this email — our team is here 24/7.",
      "",
      "— The Lemonpay team",
    ].join("\n"),
    sent_at: Timestamp.fromDate(sentAt),
    read: true,
  });
  console.log(`  ✓ lola      seeded welcome email`);
}
