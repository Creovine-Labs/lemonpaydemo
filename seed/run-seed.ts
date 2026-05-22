/**
 * CLI wrapper around the reusable seed runner.
 *
 *   npm run seed                → wipes then re-seeds
 *   npm run seed -- --no-wipe   → re-seed without wiping
 *
 * Requires .env.local to be loaded (npm script uses --env-file=.env.local).
 */

import { runSeed, getSeedCustomerSummary } from "./runner";

async function main() {
  const wipe = !process.argv.includes("--no-wipe");
  console.log(`Project: ${process.env.FIREBASE_ADMIN_PROJECT_ID}`);
  console.log("");

  const report = await runSeed({ wipe, log: (m) => console.log(m) });

  console.log("");
  console.log(`Done in ${report.duration_ms}ms.`);
  console.log("");
  console.log("Login credentials:");
  for (const c of getSeedCustomerSummary()) {
    console.log(`  ${c.handle.padEnd(8)} ${c.email}  password: lemon123`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
