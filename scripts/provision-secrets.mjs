#!/usr/bin/env node
/**
 * Read secret values from .env.local and write them to Google Secret Manager
 * via `firebase apphosting:secrets:set --force`. Run once per environment.
 *
 *   node scripts/provision-secrets.mjs
 *
 * Idempotent: re-running creates new versions of each secret.
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SECRETS = [
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "AT_API_KEY",
  "FLW_SECRET_HASH",
  "DEMO_RESET_TOKEN",
  "OTP_JWT_SECRET",
];

function parseEnvFile(path) {
  if (!existsSync(path)) {
    console.error(`No env file at ${path}`);
    process.exit(1);
  }
  const out = {};
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Convert escaped newlines back into real ones for PEM keys.
    value = value.replace(/\\n/g, "\n");
    out[key] = value;
  }
  return out;
}

const env = parseEnvFile(".env.local");
const tmp = mkdtempSync(join(tmpdir(), "lp-secrets-"));
console.log(`Using temp dir: ${tmp}`);

let success = 0;
let skipped = 0;
let failed = 0;

for (const name of SECRETS) {
  const value = env[name];
  if (!value) {
    console.log(`- ${name}: skipped (empty in .env.local)`);
    skipped++;
    continue;
  }
  const path = join(tmp, name);
  writeFileSync(path, value, { mode: 0o600 });

  console.log(`\n+ ${name}: writing…`);
  const res = spawnSync(
    "npx",
    [
      "firebase",
      "apphosting:secrets:set",
      name,
      "--data-file",
      path,
      "--force",
    ],
    { stdio: "inherit", shell: true },
  );
  if (res.status === 0) success++;
  else failed++;
}

rmSync(tmp, { recursive: true, force: true });

console.log("");
console.log(`Done. ${success} written · ${skipped} skipped · ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
