/**
 * Mocked KYC vendor for the demo (spec §10.3). Returns a result based on
 * a seed table so the Marcus demo scene is deterministic. Anyone not in
 * the table gets an 80% pass rate.
 *
 * Real production version would call Smile ID or Youverify with the same
 * input/output shape.
 */

export type KycResult =
  | { status: "passed" }
  | { status: "failed"; failure_reason: string };

/**
 * Lookup by demo handle (the custom claim set in seed/customers.ts), not
 * Firebase UID — the handle is stable across reseeds, the UID is not.
 *
 * Marcus's first attempt fails with glare-on-DOB so Lira walks him through
 * the retry; his second attempt passes.
 */
const SEED_KYC_RESULTS: Record<string, KycResult[]> = {
  marcus: [
    { status: "failed", failure_reason: "glare_on_dob" },
    { status: "passed" },
  ],
};

interface KycInput {
  /** Demo handle for known seed users (`marcus`, `lola`, …). */
  demoHandle?: string;
  /** Which attempt this is, 1-indexed. */
  attemptNumber: number;
}

export async function mockKyc(input: KycInput): Promise<KycResult> {
  // Simulate processing delay so the loading state has time to appear.
  await sleep(1000);

  if (input.demoHandle && SEED_KYC_RESULTS[input.demoHandle]) {
    const series = SEED_KYC_RESULTS[input.demoHandle];
    // Clamp to the last entry if we run out (e.g. if Marcus tries a 3rd time).
    const idx = Math.min(input.attemptNumber - 1, series.length - 1);
    return series[idx]!;
  }

  // Unseeded users: 80% pass.
  return Math.random() > 0.2
    ? { status: "passed" }
    : { status: "failed", failure_reason: "id_unreadable" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
