/**
 * Smoke test for Phase 3 service wrappers. Run with:
 *
 *   npm run smoke:services
 *
 * Sections report skipped / passed / failed and only run when their
 * credentials are present (so partial setup still gives useful output).
 *
 * Note: Flutterwave virtual-card issuance was discontinued, so cards/refunds/
 * disputes go through lib/card-provider.ts (mock) — see the
 * `flutterwave-mock` project memory for the decision.
 */

import { sendSms } from "../lib/africastalking";
import {
  createCard,
  createRefund,
  fileDispute,
  freezeCard,
  terminateCard,
  unfreezeCard,
} from "../lib/card-provider";
import { mockKyc } from "../lib/kyc-mock";

const RESULTS: Array<{ name: string; status: "passed" | "failed" | "skipped"; detail: string }> = [];

function pass(name: string, detail: string) {
  RESULTS.push({ name, status: "passed", detail });
  console.log(`  ✓ ${name}: ${detail}`);
}
function fail(name: string, detail: string) {
  RESULTS.push({ name, status: "failed", detail });
  console.log(`  ✗ ${name}: ${detail}`);
}
function skip(name: string, detail: string) {
  RESULTS.push({ name, status: "skipped", detail });
  console.log(`  - ${name}: ${detail}`);
}

async function testKycMock() {
  console.log("\nKYC mock");
  try {
    const marcusFirst = await mockKyc({ demoHandle: "marcus", attemptNumber: 1 });
    const marcusSecond = await mockKyc({ demoHandle: "marcus", attemptNumber: 2 });
    const stranger = await mockKyc({ attemptNumber: 1 });

    if (marcusFirst.status !== "failed") {
      fail("kyc.marcus.first", `expected failed, got ${marcusFirst.status}`);
      return;
    }
    if (marcusSecond.status !== "passed") {
      fail("kyc.marcus.second", `expected passed, got ${marcusSecond.status}`);
      return;
    }
    pass(
      "kyc.marcus",
      `attempt 1 → failed (${marcusFirst.status === "failed" ? marcusFirst.failure_reason : ""}), attempt 2 → passed`,
    );
    pass("kyc.stranger", `non-seeded user got ${stranger.status}`);
  } catch (err) {
    fail("kyc.mock", err instanceof Error ? err.message : String(err));
  }
}

async function testCardProvider() {
  console.log("\nCard provider (mock)");
  try {
    const created = await createCard({
      holder_name: "Lola Mukamana",
      email: "lola@lemonpay.demo",
      preferred_last4: "4242",
    });
    if (!created.ok) {
      fail("card.create", created.error.message);
      return;
    }
    const cardId = created.data.id;
    pass("card.create", `${cardId} masked=${created.data.masked_pan}`);

    const frozen = await freezeCard(cardId);
    if (!frozen.ok || frozen.data.status !== "frozen") {
      fail("card.freeze", frozen.ok ? `status=${frozen.data.status}` : frozen.error.message);
    } else {
      pass("card.freeze", "status=frozen");
    }

    const unfrozen = await unfreezeCard(cardId);
    if (!unfrozen.ok || unfrozen.data.status !== "active") {
      fail("card.unfreeze", unfrozen.ok ? `status=${unfrozen.data.status}` : unfrozen.error.message);
    } else {
      pass("card.unfreeze", "status=active");
    }

    const terminated = await terminateCard(cardId);
    if (!terminated.ok || terminated.data.status !== "terminated") {
      fail(
        "card.terminate",
        terminated.ok ? `status=${terminated.data.status}` : terminated.error.message,
      );
    } else {
      pass("card.terminate", "status=terminated");
    }

    const refund = await createRefund({ tx_ref: "seed_simba_dup_0", amount_rwf: 115_000 });
    if (!refund.ok) {
      fail("card.refund", refund.error.message);
    } else {
      pass("card.refund", `${refund.data.id} status=${refund.data.status}`);
    }

    const dispute = await fileDispute({
      tx_ref: "seed_aliexpress_fraud",
      amount_rwf: 1_620_000,
    });
    if (!dispute.ok) {
      fail("card.dispute", dispute.error.message);
    } else {
      pass(
        "card.dispute",
        `${dispute.data.id} provisional_credit=RWF ${dispute.data.provisional_credit_amount_rwf.toLocaleString()}`,
      );
    }
  } catch (err) {
    fail("card.provider", err instanceof Error ? err.message : String(err));
  }
}

async function testAfricasTalking() {
  console.log("\nAfrica's Talking");
  if (!process.env.AT_API_KEY) {
    skip("africastalking", "AT_API_KEY not set. Add it to .env.local.");
    return;
  }

  const target = process.env.AT_SMOKE_TEST_PHONE;
  if (!target) {
    skip(
      "africastalking.sendSms",
      "AT_SMOKE_TEST_PHONE not set. Set a verified sandbox number (E.164) in .env.local to actually send.",
    );
    return;
  }

  const sent = await sendSms({
    to: target,
    message: `Lemonpay smoke test ${new Date().toISOString().slice(11, 19)}`,
  });
  if (!sent.ok) {
    fail("africastalking.sendSms", `${sent.error.code}: ${sent.error.message}`);
    return;
  }
  pass(
    "africastalking.sendSms",
    `${sent.data.message_id} status=${sent.data.status} cost=${sent.data.cost}`,
  );
}

async function main() {
  console.log("Lemonpay service smoke tests");
  console.log("────────────────────────────");

  await testKycMock();
  await testCardProvider();
  await testAfricasTalking();

  const passed = RESULTS.filter((r) => r.status === "passed").length;
  const failed = RESULTS.filter((r) => r.status === "failed").length;
  const skipped = RESULTS.filter((r) => r.status === "skipped").length;

  console.log("");
  console.log("Summary:");
  console.log(`  ${passed} passed · ${failed} failed · ${skipped} skipped`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Smoke run crashed:", err);
  process.exit(1);
});
