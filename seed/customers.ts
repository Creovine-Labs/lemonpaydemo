import { adminAuth, adminDb, FieldValue, Timestamp } from "../lib/firebase-admin";
import { COLLECTIONS } from "../lib/types";

/**
 * Seed customer definitions. Phase 1 ships Lola only — the other four
 * (Marcus, Priya, Diego, Sarah) are added in Phase 5.
 *
 * Each customer has a fixed email + password (demo-only) and a deterministic
 * `handle` used for log lines. The Firebase Auth UID is assigned at runtime
 * and propagated through the seed pipeline so doc IDs match the rules.
 */

export interface SeedCustomer {
  handle: string;
  email: string;
  password: string;
  user: {
    full_name: string;
    phone_e164: string;
    national_id: string;
    date_of_birth: Date;
    address: { line1: string; city: string; district: string; country: string };
    status: "kyc_pending" | "kyc_failed" | "active" | "frozen";
    plan: "free" | "pro";
    tenure_months: number;
    ltv_rwf: number;
    churn_risk: number;
  };
  account: {
    type: "checking" | "savings";
    balance_rwf: number;
    account_number_masked: string;
  };
  card?: {
    last4: string;
    brand: "visa" | "mastercard";
    type: "virtual" | "physical";
    status: "active" | "frozen" | "terminated";
    expiry_month: number;
    expiry_year: number;
  };
}

export const CUSTOMERS: SeedCustomer[] = [
  {
    handle: "lola",
    email: "lola@lemonpay.demo",
    password: "lemon123",
    user: {
      full_name: "Lola Mukamana",
      phone_e164: "+250788111222",
      national_id: "1199580123456789",
      date_of_birth: new Date("1995-04-12"),
      address: {
        line1: "KG 14 Ave, Kigali Heights",
        city: "Kigali",
        district: "Gasabo",
        country: "Rwanda",
      },
      status: "active",
      plan: "pro",
      tenure_months: 14,
      ltv_rwf: 2_400_000,
      churn_risk: 22,
    },
    account: {
      type: "checking",
      balance_rwf: 842_500,
      account_number_masked: "***4421",
    },
    card: {
      last4: "4242",
      brand: "visa",
      type: "virtual",
      status: "active",
      expiry_month: 11,
      expiry_year: 2028,
    },
  },
  {
    handle: "marcus",
    email: "marcus@lemonpay.demo",
    password: "lemon123",
    user: {
      full_name: "Marcus Habimana",
      phone_e164: "+250788222333",
      national_id: "1200080123456788",
      date_of_birth: new Date("2000-09-21"),
      address: {
        line1: "KK 12 Ave, Kicukiro",
        city: "Kigali",
        district: "Kicukiro",
        country: "Rwanda",
      },
      status: "kyc_pending",
      plan: "free",
      tenure_months: 0,
      ltv_rwf: 0,
      churn_risk: 65,
    },
    account: {
      type: "checking",
      balance_rwf: 0,
      account_number_masked: "***0000",
    },
    // No card yet — Marcus hasn't passed KYC.
  },
  {
    handle: "priya",
    email: "priya@lemonpay.demo",
    password: "lemon123",
    user: {
      full_name: "Priya Singh",
      phone_e164: "+250788333444",
      national_id: "1199280123456787",
      date_of_birth: new Date("1992-02-08"),
      address: {
        line1: "KN 5 Ave, Nyarugenge",
        city: "Kigali",
        district: "Nyarugenge",
        country: "Rwanda",
      },
      status: "active",
      plan: "pro",
      tenure_months: 22,
      ltv_rwf: 4_100_000,
      churn_risk: 12,
    },
    account: {
      type: "checking",
      balance_rwf: 1_245_000,
      account_number_masked: "***7782",
    },
    card: {
      last4: "8810",
      brand: "visa",
      type: "virtual",
      status: "active",
      expiry_month: 6,
      expiry_year: 2029,
    },
  },
  {
    handle: "diego",
    email: "diego@lemonpay.demo",
    password: "lemon123",
    user: {
      full_name: "Diego Mugisha",
      phone_e164: "+250788444555",
      national_id: "1199180123456786",
      date_of_birth: new Date("1991-11-30"),
      address: {
        line1: "KG 9 Ave, Remera",
        city: "Kigali",
        district: "Gasabo",
        country: "Rwanda",
      },
      status: "active",
      plan: "pro",
      tenure_months: 30,
      ltv_rwf: 5_800_000,
      churn_risk: 8,
    },
    account: {
      type: "checking",
      balance_rwf: 320_000,
      account_number_masked: "***2104",
    },
    card: {
      last4: "1199",
      brand: "mastercard",
      type: "virtual",
      status: "active",
      expiry_month: 3,
      expiry_year: 2027,
    },
  },
  {
    handle: "sarah",
    email: "sarah@lemonpay.demo",
    password: "lemon123",
    user: {
      full_name: "Sarah Uwase",
      phone_e164: "+250788555666",
      national_id: "1199680123456785",
      date_of_birth: new Date("1996-07-14"),
      address: {
        line1: "KN 18 Ave, Nyarugenge",
        city: "Kigali",
        district: "Nyarugenge",
        country: "Rwanda",
      },
      status: "active",
      plan: "free",
      tenure_months: 7,
      ltv_rwf: 410_000,
      churn_risk: 38,
    },
    account: {
      type: "checking",
      balance_rwf: 95_000,
      account_number_masked: "***5503",
    },
    card: {
      last4: "5503",
      brand: "visa",
      type: "virtual",
      status: "active",
      expiry_month: 1,
      expiry_year: 2028,
    },
  },
];

export interface SeededCustomer {
  handle: string;
  uid: string;
  email: string;
  accountId: string;
  cardId?: string;
}

export async function seedCustomers(): Promise<SeededCustomer[]> {
  const results: SeededCustomer[] = [];

  for (const c of CUSTOMERS) {
    const uid = await upsertAuthUser(c.email, c.password, c.user.full_name, c.handle);

    await adminDb
      .collection(COLLECTIONS.users)
      .doc(uid)
      .set({
        full_name: c.user.full_name,
        email: c.email,
        phone_e164: c.user.phone_e164,
        national_id: c.user.national_id,
        date_of_birth: Timestamp.fromDate(c.user.date_of_birth),
        address: c.user.address,
        status: c.user.status,
        plan: c.user.plan,
        tenure_months: c.user.tenure_months,
        ltv_rwf: c.user.ltv_rwf,
        churn_risk: c.user.churn_risk,
        created_at: FieldValue.serverTimestamp(),
        last_login_at: FieldValue.serverTimestamp(),
      });

    const accountRef = adminDb.collection(COLLECTIONS.accounts).doc();
    await accountRef.set({
      user_id: uid,
      type: c.account.type,
      balance_rwf: c.account.balance_rwf,
      account_number_masked: c.account.account_number_masked,
      created_at: FieldValue.serverTimestamp(),
    });

    let cardId: string | undefined;
    if (c.card) {
      const cardRef = adminDb.collection(COLLECTIONS.cards).doc();
      // Card provider is mocked (Flutterwave discontinued virtual cards).
      // The `provider_card_id` is what /api/cards/* endpoints pass to the
      // mock card provider in lib/card-provider.ts.
      await cardRef.set({
        user_id: uid,
        flutterwave_card_id: `mcp_seed_${c.handle}_${cardRef.id.slice(0, 8)}`,
        last4: c.card.last4,
        brand: c.card.brand,
        type: c.card.type,
        status: c.card.status,
        expiry_month: c.card.expiry_month,
        expiry_year: c.card.expiry_year,
        created_at: FieldValue.serverTimestamp(),
        frozen_at: null,
        terminated_at: null,
      });
      cardId = cardRef.id;
    }

    results.push({
      handle: c.handle,
      uid,
      email: c.email,
      accountId: accountRef.id,
      cardId,
    });

    console.log(`  ✓ ${c.handle.padEnd(8)} uid=${uid} email=${c.email}`);
  }

  return results;
}

/**
 * Create the Firebase Auth user if it doesn't exist, otherwise reuse the
 * existing UID. Sets a custom claim with the demo handle so the salesperson
 * can identify seeded users at a glance.
 */
async function upsertAuthUser(
  email: string,
  password: string,
  displayName: string,
  handle: string,
): Promise<string> {
  try {
    const existing = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(existing.uid, { password, displayName });
    await adminAuth.setCustomUserClaims(existing.uid, { demoHandle: handle });
    return existing.uid;
  } catch (err: unknown) {
    if (isUserNotFound(err)) {
      const created = await adminAuth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      await adminAuth.setCustomUserClaims(created.uid, { demoHandle: handle });
      return created.uid;
    }
    throw err;
  }
}

function isUserNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "auth/user-not-found"
  );
}
