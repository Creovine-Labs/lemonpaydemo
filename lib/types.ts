import type { Timestamp } from "firebase/firestore";

/**
 * Firestore document shapes. Mirrors spec §6.
 *
 * `Timestamp` here is `firebase/firestore`'s Timestamp class — when reading
 * on the client. On the server (Admin SDK), the equivalent type is
 * `firebase-admin/firestore`'s Timestamp. The shape is compatible.
 *
 * Document IDs are the Firestore key, not part of the body. Use `WithId<T>`
 * if you want to carry the id alongside the document data.
 */

export type WithId<T> = T & { id: string };

// ---------- users ----------

export type UserStatus = "kyc_pending" | "kyc_failed" | "active" | "frozen";
export type UserPlan = "free" | "pro";

export interface Address {
  line1: string;
  city: string;
  district: string;
  country: string;
}

export interface User {
  full_name: string;
  email: string;
  phone_e164: string;
  national_id: string;
  date_of_birth: Timestamp;
  address: Address;
  status: UserStatus;
  plan: UserPlan;
  tenure_months: number;
  ltv_rwf: number;
  churn_risk: number;
  created_at: Timestamp;
  last_login_at: Timestamp;
}

// ---------- accounts ----------

export type AccountType = "checking" | "savings";

export interface Account {
  user_id: string;
  type: AccountType;
  balance_rwf: number;
  account_number_masked: string;
  created_at: Timestamp;
}

// ---------- cards ----------

export type CardBrand = "visa" | "mastercard";
export type CardType = "virtual" | "physical";
export type CardStatus = "active" | "frozen" | "terminated";

export interface Card {
  user_id: string;
  flutterwave_card_id: string;
  last4: string;
  brand: CardBrand;
  type: CardType;
  status: CardStatus;
  expiry_month: number;
  expiry_year: number;
  created_at: Timestamp;
  frozen_at?: Timestamp | null;
  terminated_at?: Timestamp | null;
}

// ---------- transactions ----------

export type TransactionStatus =
  | "pending"
  | "posted"
  | "declined"
  | "refunded"
  | "disputed";

export type TransactionType =
  | "purchase"
  | "refund"
  | "transfer_in"
  | "transfer_out";

export interface Transaction {
  user_id: string;
  card_id?: string | null;
  flutterwave_tx_ref?: string | null;
  merchant_name: string;
  merchant_id: string;
  merchant_category: string;
  amount_rwf: number;
  currency: "RWF";
  status: TransactionStatus;
  type: TransactionType;
  posted_at: Timestamp;
  metadata?: Record<string, unknown>;
}

// ---------- merchant_locks ----------

export type MerchantLockScope = "category" | "merchant";
export type MerchantLockAction = "block" | "allow";

export interface MerchantLock {
  user_id: string;
  scope: MerchantLockScope;
  target: string;
  action: MerchantLockAction;
  created_at: Timestamp;
}

// ---------- kyc_attempts ----------

export type KycStatus = "pending" | "passed" | "failed";

export interface KycAttempt {
  user_id: string;
  attempt_number: number;
  id_image_path: string;
  selfie_image_path: string;
  status: KycStatus;
  failure_reason?: string | null;
  submitted_at: Timestamp;
  resolved_at?: Timestamp | null;
}

// ---------- disputes ----------

export type DisputeReason =
  | "fraud"
  | "duplicate"
  | "not_received"
  | "wrong_amount";

export type DisputeStatus =
  | "filed"
  | "provisional_credit_issued"
  | "evidence_submitted"
  | "won"
  | "lost";

export interface DisputeEvidence {
  device_fingerprint_mismatch?: boolean;
  geo_anomaly?: boolean;
  [key: string]: unknown;
}

export interface Dispute {
  user_id: string;
  transaction_id: string;
  flutterwave_dispute_id?: string | null;
  reason: DisputeReason;
  status: DisputeStatus;
  amount_rwf: number;
  evidence: DisputeEvidence;
  filed_at: Timestamp;
  resolved_at?: Timestamp | null;
}

// ---------- limit_requests ----------

export type LimitType = "daily_spend" | "monthly_spend" | "single_transaction";
export type LimitRequestStatus = "pending" | "approved" | "denied";

export interface LimitRequest {
  user_id: string;
  type: LimitType;
  current_limit_rwf: number;
  requested_limit_rwf: number;
  status: LimitRequestStatus;
  decision_reason?: string | null;
  created_at: Timestamp;
}

// ---------- emails (fake mailbox) ----------

export type EmailDirection = "outbound" | "inbound";

export interface Email {
  user_id: string;
  direction: EmailDirection;
  thread_id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  sent_at: Timestamp;
  read: boolean;
}

// ---------- otp_codes (server-only) ----------

export type OtpPurpose = "refund_confirm" | "limit_change" | "login";

export interface OtpCode {
  user_id: string;
  code_hash: string;
  purpose: OtpPurpose;
  expires_at: Timestamp;
  consumed: boolean;
  created_at: Timestamp;
}

// ---------- api_logs (server-only) ----------

export interface ApiLog {
  endpoint: string;
  method: string;
  user_id?: string | null;
  status_code: number;
  request_id: string;
  duration_ms: number;
  error?: string | null;
  created_at: Timestamp;
}

// ---------- Collection name constants ----------

export const COLLECTIONS = {
  users: "users",
  accounts: "accounts",
  cards: "cards",
  transactions: "transactions",
  merchant_locks: "merchant_locks",
  kyc_attempts: "kyc_attempts",
  disputes: "disputes",
  limit_requests: "limit_requests",
  emails: "emails",
  otp_codes: "otp_codes",
  api_logs: "api_logs",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
