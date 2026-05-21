# Lemonpay — Demo App Build Spec

> **Version:** 1.0 — May 2026
> **Purpose:** Lemonpay is a fictional neobank we're building to host the Lira sales demo. This document covers everything needed to build it: features, frontend, backend endpoints, data model, and the Firebase + Vercel + Flutterwave + Africa's Talking stack.
> **Audience:** Engineering — 1–2 developers, 3-week build.
> **Companion doc:** `lira-nimbus-fintech-demo-spec.md` (full Lira platform spec; Lemonpay replaces "Nimbus" throughout).

---

## 1. What Lemonpay Is

A web app styled like a mobile neobank, built so we can demo Lira inside it. Real working state — customers actually freeze, refunds actually post, KYC actually flips status — but the surface area is intentionally narrow. Just enough to support the five Lira demo scenes.

It is **not** a real bank. It does not need a banking license. It runs on Flutterwave Virtual Cards in test mode and seeded Firestore data.

### Product Identity

| Attribute | Value |
|---|---|
| Name | Lemonpay |
| Tagline | "Banking, with a fresh twist." |
| Product | Mobile-first neobank — wallet, virtual + physical debit card, transfers, savings |
| Customers | Mass-market consumers, Rwanda-based, 18–45 |
| Card provider | Flutterwave Virtual Cards (test mode) |
| SMS / OTP | Africa's Talking |
| KYC vendor | Mocked for demo (real version → Smile ID or Youverify) |
| Currency | RWF (Rwandan Franc); USD optional for international demos |
| Claimed volume (in demo) | 400K customers, 35K tickets/month |
| Claimed support stack | Zendesk + 22 agents → migrated to Lira 6 weeks ago, 78% autonomous |

Branding: clean fintech aesthetic. Lemon yellow accent, deep charcoal background, white surfaces, generous whitespace. Sans-serif. One small lemon-wedge logo SVG.

---

## 2. The Demo Scenes Lemonpay Must Support

Five customer-side scenes, all driven from inside Lemonpay. The Lira agent and admin dashboard live in separate browser tabs.

| # | Scene | Channel | Lemonpay surface needed |
|---|---|---|---|
| 1 | Card decline at supermarket → merchant unlock | Voice or chat | Card screen, transaction feed, embedded Lira chat widget |
| 2 | Duplicate charge refund | Chat | Transaction feed, chat widget, OTP modal |
| 3 | Fraud dispute via email | Email | Fake mailbox UI inside the app, compose + send |
| 4 | KYC unstuck — ID upload failed | Chat | Onboarding screen stuck at KYC, photo upload, chat widget |
| 5 | Limit increase request | Chat | Settings → limits screen, chat widget |

Scenes 1–5 all use **seeded data** — the duplicate Simba Supermarket charge, the suspicious AliExpress fraud charge, Marcus stuck in `kyc_pending` — they all exist in Firestore before the demo starts.

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | Next.js 15 (App Router) | Server components for fast first paint; one repo for app + API |
| Hosting | Vercel | Same repo deploys app + endpoints; free tier covers demo traffic |
| Database | Firebase Firestore | Real-time sync, client SDK, security rules — no backend code for reads |
| Auth | Firebase Auth | Email + phone auth out of the box |
| Storage (ID uploads) | Firebase Storage | KYC photo uploads, statement PDFs |
| Backend endpoints | Vercel Serverless Functions (`/api/*`) | Lives with the frontend, no separate server |
| Payments / cards | Flutterwave (test mode) | Operates in Rwanda; supports virtual cards, refunds, disputes |
| SMS / OTP | Africa's Talking | Best Rwanda coverage, cheap, well-documented |
| KYC | Mocked locally for demo | Real version uses Smile ID or Youverify |
| Email (fake inbox) | Firestore collection rendering as a mailbox UI | No real SMTP needed |
| Language | TypeScript everywhere | Shared types between frontend and `/api` |
| Styling | Tailwind CSS + shadcn/ui | Fast iteration, matches the neobank aesthetic |
| Schema validation | Zod | At every API boundary |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       BROWSER (Vercel-hosted)                       │
│                                                                     │
│  Next.js Lemonpay app                                               │
│   ├─ Home / Wallet                                                  │
│   ├─ Transactions                                                   │
│   ├─ Cards & Controls                                               │
│   ├─ Transfers                                                      │
│   ├─ Settings → Limits, KYC, Security                               │
│   ├─ Fake mailbox (inbox view)                                      │
│   └─ Embedded Lira widget (Preact bundle)                           │
│                                                                     │
└────┬──────────────────────────────┬─────────────────────────────────┘
     │                              │
     │ direct Firestore             │ HTTPS → /api/* on same Vercel deploy
     │ (read + most writes)         │
     ▼                              ▼
┌──────────────────┐    ┌──────────────────────────────────────────────┐
│  Firebase        │    │  Vercel Serverless Functions                 │
│   ├─ Firestore   │◄───┤  (Node 22, TypeScript)                       │
│   ├─ Auth        │    │   ├─ /api/cards/freeze, /unfreeze, /replace  │
│   └─ Storage     │    │   ├─ /api/refunds                            │
└──────────────────┘    │   ├─ /api/disputes                           │
                        │   ├─ /api/otp/send, /verify                  │
                        │   ├─ /api/kyc/submit                         │
                        │   ├─ /api/webhooks/flutterwave               │
                        │   └─ /api/admin/demo-reset                   │
                        └──┬─────────────┬──────────────┬──────────────┘
                           │             │              │
                           ▼             ▼              ▼
                   ┌────────────┐  ┌─────────────┐  ┌───────────────┐
                   │ Flutterwave│  │ Africa's    │  │ Mocked KYC    │
                   │ Test Mode  │  │ Talking     │  │ (in-process)  │
                   └────────────┘  └─────────────┘  └───────────────┘
```

The Lira platform (agent + admin dashboard) is a separate deployment described in the companion spec. The Lemonpay app exposes a widget hook + email webhook for Lira to plug into.

---

## 5. Frontend — Pages & Screens

### 5.1 Page Inventory

| Route | Purpose | Auth required |
|---|---|---|
| `/` | Landing page (marketing) | No |
| `/signup` | Account creation start | No |
| `/signup/kyc` | KYC step — ID upload + selfie | Yes (partial auth) |
| `/signup/pending` | "We're verifying" — flips to active when KYC passes | Yes |
| `/app` | Home / wallet dashboard | Yes |
| `/app/transactions` | Full transaction history with filters | Yes |
| `/app/transactions/:id` | Single transaction detail | Yes |
| `/app/cards` | List of cards + virtual card view | Yes |
| `/app/cards/:id` | Card detail — freeze, replace, controls | Yes |
| `/app/cards/:id/controls` | Merchant locks, geo locks, category locks | Yes |
| `/app/transfers` | Send money screen | Yes |
| `/app/inbox` | Fake email mailbox for the fraud-dispute scene | Yes |
| `/app/inbox/compose` | Compose an email to support | Yes |
| `/app/inbox/:id` | View a thread | Yes |
| `/app/settings` | Settings hub | Yes |
| `/app/settings/limits` | Current limits + request increase | Yes |
| `/app/settings/kyc` | KYC status | Yes |
| `/app/settings/security` | MFA, password, sessions | Yes |
| `/app/help` | Always-visible Lira chat widget anchor | Yes |

### 5.2 The Always-Visible Lira Chat Widget

On every authenticated page, a floating chat button bottom-right. Click → opens a slide-up panel. This is where Lira lives inside Lemonpay.

The widget is a separate Preact bundle (built in `apps/widget/`) embedded via a one-liner `<script>` tag on the Lemonpay layout. It communicates with the Lira backend over WebSocket, not with Lemonpay's `/api/*`. Lemonpay just hosts it.

### 5.3 Key Screens — What Each Needs

#### Home / Wallet (`/app`)
- Balance card with current balance, masked account number, copy button
- "Today" transactions strip (3 most recent)
- Quick actions: Send, Request, Freeze card, Help
- Card preview (virtual card with card number masked)
- Floating Lira widget button

#### Transactions (`/app/transactions`)
- Searchable, filterable list (by merchant, amount, date, category)
- Each row: merchant logo, name, category, amount, date, status chip
- Tapping a row opens transaction detail in a sheet
- For Scene 2 (duplicate refund): Lola needs to see two identical Simba Supermarket charges next to each other in this list

#### Cards (`/app/cards/:id`)
- Big virtual card visual with reveal-to-see-number toggle
- Freeze toggle (calls `/api/cards/:id/freeze`)
- "Replace card" button
- Card status chip: `active`, `frozen`, `terminated`
- Controls link → `/app/cards/:id/controls`

#### Card Controls (`/app/cards/:id/controls`)
- **Merchant category locks**: Groceries, Restaurants, Fuel, Online shopping, Gambling, Cash advances, Travel, Subscriptions
- **Geographic locks**: Rwanda default; toggle for other African countries; toggle for international
- **Merchant allow list**: list of merchants that bypass category locks — this is what Lira modifies in Scene 1

#### Onboarding KYC (`/signup/kyc`)
- Step 1: Personal info (name, DOB, ID number, phone, address)
- Step 2: ID upload — front + back of national ID
- Step 3: Live selfie capture (browser MediaDevices API)
- Step 4: Submit → goes to `/signup/pending`
- For Scene 4 (Marcus): the seed places Marcus at step 4 with a failed ID upload due to glare. The Lira widget on `/signup/pending` is how he gets unstuck.

#### Inbox (`/app/inbox`)
- Renders a Firestore collection `emails` filtered to the current user
- Compose button → modal with To/Subject/Body, "To" is locked to `support@lemonpay.rw`
- On send, writes to Firestore `emails` collection; Lira backend has a Firestore trigger on inserts to that collection, processes the email as if it arrived via SMTP
- Replies from Lira come back as new docs in the same collection, rendered as a thread

#### Limits (`/app/settings/limits`)
- Shows current limits (daily spend, monthly spend, single transaction, daily ATM)
- "Request increase" button → opens chat widget pre-loaded with "I'd like a higher limit"
- This is the entry point to Scene 5

### 5.4 Component Library

| Component | Purpose | Est. lines |
|---|---|---|
| `<BalanceCard />` | Hero balance display | 80 |
| `<TransactionRow />` | One row in transaction list | 60 |
| `<TransactionDetail />` | Bottom sheet with full transaction info | 120 |
| `<VirtualCard />` | The animated card visual | 140 |
| `<CardControls />` | Lock toggles + merchant list | 180 |
| `<KycStepper />` | 4-step KYC flow | 200 |
| `<PhotoCapture />` | Live selfie / ID camera | 160 |
| `<EmailThread />` | Thread view in the fake mailbox | 120 |
| `<ComposeEmail />` | Compose modal | 100 |
| `<LimitsPanel />` | Current limits + request CTA | 80 |
| `<OtpModal />` | OTP input for step-up | 90 |
| `<LiraWidgetAnchor />` | Floating button + slide-up panel anchor | 60 |
| `<TopNav />` / `<BottomTabs />` | App chrome | 120 |
| `<TransferForm />` | Send money form | 140 |

Total frontend: ~1,650 lines TS/TSX. Realistic in 5–6 working days.

---

## 6. Data Model — Firestore Collections

All collections are under the root (no multi-tenancy for the demo).

### `users`
```
users/{uid}
  full_name: string
  email: string
  phone_e164: string       // "+250 7XX XXX XXX"
  national_id: string      // 16 digits, Rwandan
  date_of_birth: timestamp
  address: { line1, city, district, country }
  status: "kyc_pending" | "kyc_failed" | "active" | "frozen"
  plan: "free" | "pro"
  tenure_months: number
  ltv_rwf: number
  churn_risk: number       // 0–100
  created_at: timestamp
  last_login_at: timestamp
```

### `accounts`
```
accounts/{accountId}
  user_id: string          // FK → users
  type: "checking" | "savings"
  balance_rwf: number
  account_number_masked: string  // "***4421"
  created_at: timestamp
```

### `cards`
```
cards/{cardId}
  user_id: string
  flutterwave_card_id: string
  last4: string
  brand: "visa" | "mastercard"
  type: "virtual" | "physical"
  status: "active" | "frozen" | "terminated"
  expiry_month: number
  expiry_year: number
  created_at: timestamp
  frozen_at: timestamp?
  terminated_at: timestamp?
```

### `transactions`
```
transactions/{txId}
  user_id: string
  card_id: string?
  flutterwave_tx_ref: string?
  merchant_name: string
  merchant_id: string
  merchant_category: string  // MCC-ish category
  amount_rwf: number
  currency: "RWF"
  status: "pending" | "posted" | "declined" | "refunded" | "disputed"
  type: "purchase" | "refund" | "transfer_in" | "transfer_out"
  posted_at: timestamp
  metadata: { ... }          // raw Flutterwave payload reference
```

### `merchant_locks`
```
merchant_locks/{lockId}
  user_id: string
  scope: "category" | "merchant"
  target: string             // category name or merchant_id
  action: "block" | "allow"
  created_at: timestamp
```

### `kyc_attempts`
```
kyc_attempts/{attemptId}
  user_id: string
  attempt_number: number
  id_image_path: string      // Firebase Storage path
  selfie_image_path: string
  status: "pending" | "passed" | "failed"
  failure_reason: string?    // "glare_on_dob", "id_mismatch", etc.
  submitted_at: timestamp
  resolved_at: timestamp?
```

### `disputes`
```
disputes/{disputeId}
  user_id: string
  transaction_id: string
  flutterwave_dispute_id: string?
  reason: "fraud" | "duplicate" | "not_received" | "wrong_amount"
  status: "filed" | "provisional_credit_issued" | "evidence_submitted" | "won" | "lost"
  amount_rwf: number
  evidence: { device_fingerprint_mismatch: bool, geo_anomaly: bool, ... }
  filed_at: timestamp
  resolved_at: timestamp?
```

### `limit_requests`
```
limit_requests/{requestId}
  user_id: string
  type: "daily_spend" | "monthly_spend" | "single_transaction"
  current_limit_rwf: number
  requested_limit_rwf: number
  status: "pending" | "approved" | "denied"
  decision_reason: string?
  created_at: timestamp
```

### `emails` (fake mailbox)
```
emails/{emailId}
  user_id: string
  direction: "outbound" | "inbound"   // outbound = customer→support; inbound = support→customer
  thread_id: string
  from: string
  to: string
  subject: string
  body: string
  sent_at: timestamp
  read: boolean
```

### `otp_codes` (short-lived, server-only access)
```
otp_codes/{otpId}
  user_id: string
  code_hash: string          // never store plaintext
  purpose: "refund_confirm" | "limit_change" | "login"
  expires_at: timestamp
  consumed: boolean
  created_at: timestamp
```

### Firestore Indexes Needed
- `transactions` composite: `user_id ASC, posted_at DESC`
- `transactions` composite: `user_id ASC, merchant_id ASC, posted_at DESC`
- `emails` composite: `user_id ASC, sent_at DESC`
- `cards` composite: `user_id ASC, status ASC`

---

## 7. The 10 Endpoints (Vercel Serverless Functions)

All endpoints live in `/api/` of the Next.js app. Each is a single file (Node 22, TypeScript). Standard contract:

- Auth: every endpoint except `/api/webhooks/*` requires a valid Firebase ID token in `Authorization: Bearer <token>`
- Input validation: Zod schema on every request body
- Response shape: `{ ok: true, data: ... }` or `{ ok: false, error: { code, message } }`
- Idempotency: money-moving endpoints accept `Idempotency-Key` header
- Logging: every call writes to a Firestore `api_logs` collection for debugging

### 7.1 `POST /api/cards/[id]/freeze`

**What:** Marks a card as frozen so no new charges go through.
**Calls:** Flutterwave Virtual Cards API → `PUT /v3/virtual-cards/:id/status/block`
**Updates:** Firestore `cards/{cardId}.status = "frozen"`, sets `frozen_at`
**Auth:** Customer must own the card, or be Lira service account
**Body:** `{ reason: "lost" | "stolen" | "fraud" | "user_request" }`
**Returns:** `{ ok: true, data: { card_id, status: "frozen" } }`

### 7.2 `POST /api/cards/[id]/unfreeze`

**What:** Reactivates a frozen card.
**Calls:** Flutterwave → `PUT /v3/virtual-cards/:id/status/unblock`
**Updates:** Firestore `cards/{cardId}.status = "active"`, clears `frozen_at`
**Body:** `{ }` (no body needed)
**Returns:** `{ ok: true, data: { card_id, status: "active" } }`

### 7.3 `POST /api/cards/[id]/replace`

**What:** Terminates the existing card and issues a new one for the same user.
**Calls:** Flutterwave → `PUT /v3/virtual-cards/:id/terminate`, then `POST /v3/virtual-cards`
**Updates:** Old card row → `status = "terminated"`, `terminated_at` set. Creates new `cards/{newCardId}` row.
**Body:** `{ reason: "fraud" | "damaged" | "lost", expedited: boolean }`
**Returns:** `{ ok: true, data: { old_card_id, new_card_id, expected_arrival: "2-5 business days" } }`

### 7.4 `POST /api/refunds`

**What:** Sends money back to the customer for a specific transaction.
**Calls:** Flutterwave → `POST /v3/refunds` with `{ id: tx_ref, amount }`
**Updates:** Transaction → `status = "refunded"`. Adds `transactions/{newRefundId}` of type `refund`. Adjusts account balance.
**Body:** `{ transaction_id: string, amount_rwf: number, reason: "duplicate"|"fraud"|"customer_request" }`
**Idempotency-Key:** required. Format: `refund:{transaction_id}:{conversation_id}`
**Auth note:** must include either customer OTP verification token OR Lira approval token (for >RWF 250,000)
**Returns:** `{ ok: true, data: { refund_id, status, expected_in_account: "30 seconds" } }`

### 7.5 `POST /api/disputes`

**What:** Files a chargeback / dispute against a transaction.
**Calls:** Flutterwave → `POST /v3/chargebacks/:tx_id/accept` with evidence
**Updates:** Creates `disputes/{disputeId}`, transaction → `status = "disputed"`. If reason = fraud, also calls `/api/cards/:id/freeze` and `/api/cards/:id/replace` automatically.
**Body:** `{ transaction_id: string, reason: "fraud"|"duplicate"|"not_received"|"wrong_amount", evidence?: { ... } }`
**Idempotency-Key:** required. Format: `dispute:{transaction_id}`
**Returns:** `{ ok: true, data: { dispute_id, provisional_credit_amount, provisional_credit_eta: "1 business day" } }`

### 7.6 `POST /api/otp/send`

**What:** Generates a 6-digit code, stores its bcrypt hash, sends the code via SMS.
**Calls:** Africa's Talking SMS API → `POST /version1/messaging`
**Updates:** Creates `otp_codes/{otpId}` with hash, expiry (5 min), consumed=false. Returns OTP ID to caller (not the code).
**Body:** `{ purpose: "refund_confirm"|"limit_change"|"login" }`
**Returns:** `{ ok: true, data: { otp_id, expires_in_seconds: 300 } }`
**Rate limit:** max 3 OTP sends per user per hour, enforced server-side

### 7.7 `POST /api/otp/verify`

**What:** Verifies a code the user typed against the stored hash.
**Calls:** None external. bcrypt compare + Firestore update.
**Updates:** Marks `otp_codes/{otpId}.consumed = true` on success. Returns a short-lived verification token (JWT, 5 min) that subsequent endpoints (like `/api/refunds`) accept.
**Body:** `{ otp_id: string, code: string }`
**Returns:** `{ ok: true, data: { verification_token, expires_in_seconds: 300 } }`
**Failure modes:** wrong code → increments attempt counter; 5 wrong attempts → invalidates the OTP

### 7.8 `POST /api/kyc/submit`

**What:** Receives ID + selfie image refs, runs verification, updates user status.
**Calls:** **Mocked for the demo** — the function waits 1 second and returns a result based on seed data:
- Marcus's first attempt → `failed` with `failure_reason: "glare_on_dob"`
- Marcus's retry (after Lira walks him through it) → `passed`
- Any new user not in seed → 80% pass, 20% fail randomly
**Real production version:** would call Smile ID or Youverify
**Updates:** Creates `kyc_attempts/{attemptId}`. On `passed`, updates `users/{uid}.status = "active"`.
**Body:** `{ id_image_path: string, selfie_image_path: string }` (Firebase Storage paths)
**Returns:** `{ ok: true, data: { attempt_id, status: "passed"|"failed", failure_reason?: string } }`

### 7.9 `POST /api/webhooks/flutterwave`

**What:** Receives event notifications from Flutterwave (refund completed, dispute updated, charge settled, etc.).
**Calls:** None — this is INCOMING. Verifies the `verif-hash` header matches `FLW_SECRET_HASH` env var.
**Updates:** Firestore — updates the relevant transaction, refund, or dispute doc based on event type.
**Body:** Flutterwave's standard webhook payload (varies by event)
**Returns:** `200 OK` quickly so Flutterwave doesn't retry
**No auth header required** — security is via the `verif-hash` signature check.

Events handled:
- `charge.completed` → update `transactions/{txId}.status = "posted"`
- `refund.completed` → update `transactions/{txId}.status = "refunded"`
- `chargeback.created` → update `disputes/{disputeId}.status = "provisional_credit_issued"`
- `chargeback.resolved` → update `disputes/{disputeId}.status = "won"|"lost"`

### 7.10 `POST /api/admin/demo-reset`

**What:** Wipes seeded data, re-runs the seed, resets Flutterwave test data. Only callable with the demo secret.
**Calls:** Flutterwave test endpoints to restore card state if needed.
**Updates:** Truncates user-scoped Firestore collections (transactions, cards, disputes, kyc_attempts, etc.), then re-runs seed.
**Auth:** `Authorization: Bearer <DEMO_RESET_TOKEN>` — token in env, not a Firebase ID token
**Body:** `{ }` or `{ scope: "all" | "user", user_id?: string }`
**Returns:** `{ ok: true, data: { reset_at, customers_reseeded: 5, transactions_reseeded: 80 } }`

---

## 8. Where Firebase Fits

### 8.1 Firestore — Direct Browser Access

The Lemonpay app uses `firebase/firestore` client SDK for **all reads** and **most writes**. No `/api/*` involved for these:

| Operation | How |
|---|---|
| Read user profile | `getDoc(doc(db, "users", uid))` |
| Subscribe to balance changes | `onSnapshot(doc(db, "accounts", accountId), ...)` |
| List transactions | `getDocs(query(collection(db, "transactions"), where("user_id", "==", uid), orderBy("posted_at", "desc"), limit(50)))` |
| List cards | Same pattern |
| Read merchant locks | Same pattern |
| Add a merchant lock (user-initiated) | `addDoc(collection(db, "merchant_locks"), { ... })` |
| Remove a merchant lock | `deleteDoc(...)` |
| Compose email to support | `addDoc(collection(db, "emails"), { direction: "outbound", ... })` |
| Read inbox / threads | Subscription with `onSnapshot` |
| Watch KYC status flip live | `onSnapshot(doc(db, "users", uid))` |

### 8.2 Security Rules (Critical)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read + update their own profile (limited fields)
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId
                    && !("status" in request.resource.data.diff(resource.data).affectedKeys())
                    && !("plan" in request.resource.data.diff(resource.data).affectedKeys());
      allow create: if request.auth.uid == userId;
    }

    // Accounts: read-only for owner; writes only via Admin SDK (server)
    match /accounts/{accountId} {
      allow read: if request.auth.uid == resource.data.user_id;
      allow write: if false;   // server-only
    }

    // Transactions: read-only for owner; writes via Admin SDK
    match /transactions/{txId} {
      allow read: if request.auth.uid == resource.data.user_id;
      allow write: if false;
    }

    // Cards: read for owner, no writes (must use endpoints to freeze/replace)
    match /cards/{cardId} {
      allow read: if request.auth.uid == resource.data.user_id;
      allow write: if false;
    }

    // Merchant locks: owner can create/delete their own
    match /merchant_locks/{lockId} {
      allow read: if request.auth.uid == resource.data.user_id;
      allow create: if request.auth.uid == request.resource.data.user_id;
      allow delete: if request.auth.uid == resource.data.user_id;
      allow update: if false;
    }

    // Disputes: read for owner; writes via endpoint only
    match /disputes/{disputeId} {
      allow read: if request.auth.uid == resource.data.user_id;
      allow write: if false;
    }

    // Limit requests: owner can create; server resolves
    match /limit_requests/{reqId} {
      allow read: if request.auth.uid == resource.data.user_id;
      allow create: if request.auth.uid == request.resource.data.user_id;
      allow update: if false;
    }

    // Emails: owner can read + create outbound
    match /emails/{emailId} {
      allow read: if request.auth.uid == resource.data.user_id;
      allow create: if request.auth.uid == request.resource.data.user_id
                    && request.resource.data.direction == "outbound";
      allow update, delete: if false;
    }

    // OTP codes: server-only, never client-readable
    match /otp_codes/{otpId} {
      allow read, write: if false;
    }

    // KYC attempts: server-only writes; owner can read
    match /kyc_attempts/{attemptId} {
      allow read: if request.auth.uid == resource.data.user_id;
      allow write: if false;
    }

    // API logs: server-only
    match /api_logs/{logId} {
      allow read, write: if false;
    }
  }
}
```

The Admin SDK used by `/api/*` endpoints bypasses these rules — that's correct and intentional.

### 8.3 Firebase Auth

- Email + password for the demo (simplest)
- Phone auth available if we want to demo SMS-based login
- Each user's `uid` is what we key Firestore documents on
- Custom claims used to flag the seeded demo users (e.g., `lola`, `marcus`) so the salesperson can log in as them quickly

### 8.4 Firebase Storage

- ID photos and selfies uploaded during KYC
- Bucket: `lemonpay-demo-uploads`
- Path convention: `kyc/{uid}/{attemptId}/id_front.jpg`, `kyc/{uid}/{attemptId}/selfie.jpg`
- Security rule: only the uploader can read; server-side functions can read all

---

## 9. Where Vercel Fits

### 9.1 What Vercel Hosts

- The Next.js Lemonpay app (App Router pages, server components, client components)
- All 10 `/api/*` serverless functions
- Static assets (logo, fonts, marketing images)
- Edge caching for marketing pages (`/`, `/about`, etc.)

### 9.2 Project Layout

```
lemonpay/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx              # /
│   │   └── about/page.tsx
│   ├── signup/
│   │   ├── page.tsx              # /signup
│   │   ├── kyc/page.tsx
│   │   └── pending/page.tsx
│   ├── app/
│   │   ├── layout.tsx            # authenticated layout w/ Lira widget
│   │   ├── page.tsx              # /app (home)
│   │   ├── transactions/...
│   │   ├── cards/[id]/...
│   │   ├── transfers/page.tsx
│   │   ├── inbox/...
│   │   ├── settings/...
│   │   └── help/page.tsx
│   └── api/
│       ├── cards/[id]/freeze/route.ts
│       ├── cards/[id]/unfreeze/route.ts
│       ├── cards/[id]/replace/route.ts
│       ├── refunds/route.ts
│       ├── disputes/route.ts
│       ├── otp/send/route.ts
│       ├── otp/verify/route.ts
│       ├── kyc/submit/route.ts
│       ├── webhooks/flutterwave/route.ts
│       └── admin/demo-reset/route.ts
├── components/
│   ├── BalanceCard.tsx
│   ├── TransactionRow.tsx
│   ├── VirtualCard.tsx
│   ├── KycStepper.tsx
│   ├── OtpModal.tsx
│   └── ... (see §5.4)
├── lib/
│   ├── firebase-client.ts        # client SDK init
│   ├── firebase-admin.ts         # Admin SDK init (server-only)
│   ├── flutterwave.ts            # Flutterwave client wrapper
│   ├── africastalking.ts         # SMS wrapper
│   ├── kyc-mock.ts               # demo KYC stub
│   └── schemas.ts                # Zod schemas for all endpoints
├── seed/
│   ├── customers.ts
│   ├── transactions.ts
│   └── run-seed.ts               # invoked by /api/admin/demo-reset
├── public/
│   └── logo.svg
├── firestore.rules
├── firestore.indexes.json
├── next.config.js
├── tailwind.config.ts
├── package.json
└── .env.local                    # see §9.4
```

### 9.3 Vercel Configuration

- **Framework preset:** Next.js
- **Node version:** 22.x
- **Function regions:** `fra1` (Frankfurt) — closest to Rwanda with low latency. Alternative: `cdg1` (Paris). Avoid `iad1` for African demos.
- **Function memory:** 1024 MB default
- **Function max duration:** 30s (Vercel free tier limit; enough for all calls)
- **Build command:** `next build`
- **Output directory:** `.next` (default)

### 9.4 Environment Variables (on Vercel dashboard)

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_ADMIN_PRIVATE_KEY=...    # for Admin SDK on /api
FIREBASE_ADMIN_CLIENT_EMAIL=...

# Flutterwave (TEST keys only)
FLW_PUBLIC_KEY=FLWPUBK_TEST-...
FLW_SECRET_KEY=FLWSECK_TEST-...
FLW_SECRET_HASH=...               # for verifying webhook signatures

# Africa's Talking
AT_USERNAME=sandbox               # use sandbox for the demo
AT_API_KEY=atsk_...
AT_SENDER_ID=LEMONPAY             # alphanumeric sender ID (must be registered)

# Lira integration
LIRA_API_BASE=https://lira-api.example.com
LIRA_SHARED_SECRET=...            # HMAC for widget user verification

# Demo controls
DEMO_RESET_TOKEN=lp_demo_<random>
NEXT_PUBLIC_DEMO_MODE=true        # enables demo-only UI hints
```

### 9.5 Why Vercel Specifically

- **Same repo, same deploy** — frontend and `/api` ship together, one PR.
- **Free tier is plenty** — demos won't exceed free quota.
- **Frankfurt region** — ~150ms latency to Kigali, much better than US-East.
- **Cold start mitigation:** Vercel's serverless cold starts are ~500ms–1.5s typically. The demo-reset call before each demo warms the most-used endpoints.

---

## 10. External Services

### 10.1 Flutterwave (Payments + Cards)

- **Test mode account:** create at dashboard.flutterwave.com, use **test secret key** (`FLWSECK_TEST-...`) exclusively
- **What we use:**
  - Virtual Cards API — create, freeze, unfreeze, terminate cards
  - Refunds API — refund a transaction
  - Chargebacks API — file disputes
  - Webhooks — listen for state changes
- **Test cards:** Flutterwave provides test card numbers that simulate success / decline / fraud scenarios. Document these in `seed/customers.ts`.
- **Currency:** RWF supported; USD also available for international demos

### 10.2 Africa's Talking (SMS)

- **Sandbox vs Production:**
  - For dev: use sandbox (`AT_USERNAME=sandbox`) — free, requires verifying recipient phones in the dashboard
  - For real demos: production account, ~RWF 16 per SMS to Rwandan numbers
- **Sender ID:** must register `LEMONPAY` as an alphanumeric sender ID. Takes 1–3 business days.
- **Endpoint:** `POST https://api.africastalking.com/version1/messaging`
- **Library:** `africastalking` npm package

### 10.3 KYC (Mocked)

For the demo: a TypeScript function in `lib/kyc-mock.ts`:

```ts
export async function mockKyc(uid: string, attemptNumber: number) {
  await sleep(1000);  // simulate processing delay
  const seed = SEED_KYC_RESULTS[uid]?.[attemptNumber];
  if (seed) return seed;
  return Math.random() > 0.2
    ? { status: "passed" }
    : { status: "failed", failure_reason: "id_unreadable" };
}
```

For real Lemonpay later, swap this for:
- **Smile ID** — supports Rwanda national ID + selfie liveness, $0.30–$1.00 per check
- **Youverify** — supports Rwanda, similar pricing, broader African coverage

---

## 11. Demo Data — What Gets Seeded

The `/api/admin/demo-reset` endpoint creates this exact state. Use `faker.seed(42)` for deterministic output.

### 11.1 Five Seed Customers

| User ID (custom claim) | Name | Status | Plan | Notes |
|---|---|---|---|---|
| `lola` | Lola Mukamana | active | pro | Scene 1, 2, 3 protagonist. Pre-existing duplicate Simba charges. SkyMall-style suspicious AliExpress charge. |
| `marcus` | Marcus Habimana | kyc_pending | free | Scene 4. One failed KYC attempt with `failure_reason: "glare_on_dob"`. |
| `priya` | Priya Singh | active | pro | Scene 5. Has a pending `limit_requests` doc. |
| `diego` | Diego Mugisha | active | pro | Background — for "show me top failing intents" admin demo. |
| `sarah` | Sarah Uwase | active | pro | Background — makes user lists feel populated. |

### 11.2 Seeded Transactions for Lola

- ~30 normal historical transactions over the last 60 days (Simba, Java House, Bourbon Coffee, MTN airtime, Kigali Heights restaurants, Uber)
- **Two identical charges** at "Simba Supermarket" of RWF 115,000 each (the duplicate from Scene 2)
- **One suspicious AliExpress charge** of RWF 1,620,000 at 03:00 UTC from an unknown device fingerprint (Scene 3)
- One pending authorization on her current day for the grocery decline scene

### 11.3 Seeded KB for the Lira Side

(Lives in the Lira spec, but referenced here so devs know it exists)

24 knowledge articles in `seed/kb/*.md` covering refunds, disputes, card replacement, merchant locks, KYC retry guide, ACH/MTN MoMo timing, limits, fees, security. The Lira backend ingests these into Qdrant on first boot.

### 11.4 Pre-populated Audit Log

~200 fake audit-log entries from the "past 6 weeks of Lira running" so the admin dashboard doesn't look empty. Generated deterministically.

---

## 12. Security & Compliance Notes

Even though it's a demo, the architecture must look production-ready to bank buyers.

- **No secrets in the browser.** Flutterwave secret key, Africa's Talking API key, Firebase Admin private key — all server-only env vars.
- **PII handling.** Never log full national IDs, phone numbers, or card PANs. The `api_logs` collection redacts.
- **OTP security.** Codes stored as bcrypt hashes, never plaintext. 5-min expiry. 5-attempt lockout.
- **Idempotency.** All money-moving endpoints require an `Idempotency-Key` header and check before executing.
- **Webhook signature verification.** Flutterwave's `verif-hash` header is compared to `FLW_SECRET_HASH`. Reject mismatches.
- **Firebase Security Rules.** Default-deny on all server-managed collections (cards, transactions, disputes, kyc, otp).
- **Demo reset token.** Stored in env, never in code. Used only by team.

---

## 13. Build Plan — 3-Week Sprint

### Week 1 — Foundations

- [ ] Vercel project + Firebase project created
- [ ] Next.js app scaffolded, Tailwind + shadcn set up
- [ ] Firestore data model defined, security rules deployed
- [ ] Firebase Auth wired (email + password)
- [ ] Seed script writing all 5 customers + transactions + KYC attempts
- [ ] Lemonpay home, transactions, cards screens — pulling from Firestore
- [ ] Embedded Lira widget anchor (script tag, opens panel)

**Milestone:** A logged-in Lola can see her balance, transactions, and cards. Widget button works (even if Lira backend isn't responding yet).

### Week 2 — Endpoints + Key Flows

- [ ] Flutterwave test account + virtual card created for Lola
- [ ] `/api/cards/freeze`, `/unfreeze`, `/replace`
- [ ] `/api/refunds`, `/api/disputes`
- [ ] `/api/otp/send`, `/api/otp/verify` (with Africa's Talking sandbox)
- [ ] `/api/kyc/submit` (mocked)
- [ ] `/api/webhooks/flutterwave`
- [ ] OTP modal component working end-to-end
- [ ] KYC flow (signup → upload → mocked check → pending → active)
- [ ] Fake mailbox (compose + thread view)
- [ ] Limit increase request screen

**Milestone:** All 5 demo scenes runnable via Lira widget driving the right `/api/*` calls.

### Week 3 — Polish + Reset + Dress Rehearsals

- [ ] `/api/admin/demo-reset` working — full state restore in <3s
- [ ] Hidden keyboard shortcut on Lira admin (`Ctrl+Shift+R`) to call reset
- [ ] Branded styling pass (lemon yellow, charcoal, logo, marketing page)
- [ ] Mobile-styled responsive frame around the app (looks like a phone in a browser)
- [ ] Fallback dialogue scripts if Flutterwave or AT is down
- [ ] 3 full dress rehearsals from cold start
- [ ] Demo runbook (see §14)

**Milestone:** Salesperson can run the full 25-minute demo without touching code.

---

## 14. Demo-Day Runbook (Lemonpay Side)

Before the meeting:

1. Open two browser tabs:
   - Tab A: `https://lemonpay.vercel.app` — logged in as Lola
   - Tab B: `https://lira-admin.example.com` — Lira admin dashboard
2. Hit `Ctrl+Shift+R` in Tab B → demo-reset runs → all data fresh
3. Click the Lira widget once in Tab A to warm up the WebSocket
4. Hit `/api/cards/cust_lola_card_1/freeze` then `/unfreeze` once via the admin (warms the function)

During the meeting:

| Minute | Tab | Action |
|---|---|---|
| 0:00 | A | Show Lola's wallet. "This is our customer's view of Lemonpay." |
| 0:30 | A | Trigger Scene 1 — card decline at Simba, open chat widget |
| 3:00 | B | Switch to Lira admin — show live conversation |
| 5:00 | A | Trigger Scene 2 — Lola messages about duplicate Simba charge |
| 9:00 | A | Trigger Scene 3 — open inbox → fraud email already drafted in seed → send it |
| 14:00 | A | Switch to Marcus's signup → Scene 4 (KYC retry) |
| 17:00 | A | Switch back to Lola → Scene 5 (limit increase) |
| 20:00 | B | Full Lira admin tour |

If something breaks, the fallback dialogue plays from a fixture file and the customer-facing UI never shows an error.

---

## 15. Explicitly Out of Scope

- ❌ Mobile native apps (Lemonpay is web only, styled to look mobile)
- ❌ Real ACH / RTGS / MTN MoMo integration (mocked)
- ❌ Multi-language UI (English only)
- ❌ Real SMTP for inbox (Firestore-backed fake mailbox)
- ❌ Real KYC vendor (mocked locally)
- ❌ Physical card production (virtual cards only)
- ❌ Marketing website beyond a single landing page
- ❌ Multi-tenancy / multi-org (single tenant)
- ❌ Production-grade WAF / IDS (Vercel's defaults + Firestore rules are enough for the demo)
- ❌ Real audit log export for regulators (Lira's audit log covers this — Lemonpay just emits events)

---

## 16. Glossary

- **Webhook** — an HTTP endpoint *your* server exposes so an external service (Flutterwave) can notify you when something happens (refund cleared, dispute updated). Inbound traffic.
- **Idempotency key** — a unique string sent with a request so that retrying the request doesn't double-charge / double-refund. The server remembers seen keys.
- **OTP** — One-Time Password, a 6-digit code sent via SMS to confirm an action.
- **KYC** — "Know Your Customer", the regulatory process of verifying identity with an ID + selfie.
- **Mocked vendor** — a function in our codebase that *pretends* to call a third-party service. Used to avoid real cost / setup during demos.
- **Cold start** — when a serverless function hasn't been called recently, it takes longer (~1s) to spin up. Subsequent calls are fast.
- **Seed data** — pre-populated data inserted into the database before the demo so all customers, transactions, and edge cases are already there.
- **Admin SDK** — the server-side Firebase library that bypasses security rules. Used in `/api/*` endpoints.
- **Service account** — the Lira backend's identity when it calls Lemonpay endpoints. Has a special token that lets it act on any user.

---

## 17. Linked Documents

- [lira-nimbus-fintech-demo-spec.md](lira-nimbus-fintech-demo-spec.md) — full Lira platform spec (the agent, admin dashboard, workflows). Lemonpay is the "Nimbus" referenced throughout that doc.
- [lira-agent-capability-architecture.md](lira-agent-capability-architecture.md) — Lira product architecture
- [lira-dashboard-wireframe.html](lira-dashboard-wireframe.html) — admin dashboard visual reference

---

**End of spec. v1.0 — May 2026.**
