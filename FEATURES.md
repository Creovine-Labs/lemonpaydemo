# Lemonpay — Platform Features

Lemonpay is a web app styled like a mobile neobank, built to host the Lira sales demo. Real working state — freezes actually take effect, refunds actually post, KYC actually flips status — but the surface area is intentionally narrow.

This document catalogs what the platform actually does today.

---

## 1. Identity & Onboarding

### Sign up & login
- Email + password authentication via Firebase Auth ([app/signup](app/signup/), [app/login](app/login/))
- Session-aware app shell that redirects unauthenticated users to `/login` ([app/app/layout.tsx](app/app/layout.tsx))
- Seeded demo users with custom claims (`lola`, `marcus`, `priya`, `diego`, `sarah`) for one-click demo personas

### KYC flow
- Multi-step KYC stepper: personal info → ID upload (front + back) → live selfie → submit ([components/KycStepper.tsx](components/KycStepper.tsx), [components/PhotoCapture.tsx](components/PhotoCapture.tsx))
- Browser `MediaDevices` API for live selfie capture
- Firebase Storage uploads at `kyc/{uid}/{attemptId}/...`
- Mocked verification with deterministic seed outcomes (Marcus's first attempt fails with `glare_on_dob`; retry passes) and 80/20 random for unseeded users ([lib/kyc-mock.ts](lib/kyc-mock.ts))
- Pending-state screen that live-flips to active via `onSnapshot` on the user doc

---

## 2. Wallet & Account

### Home dashboard ([app/app/page.tsx](app/app/page.tsx))
- Live balance card subscribed to `accounts/{accountId}` via `onSnapshot` ([components/BalanceCard.tsx](components/BalanceCard.tsx))
- Masked account number with copy button
- Three most-recent transactions strip
- Quick actions: Send, Top up, Pay bill, Freeze card, Help ([components/QuickActions.tsx](components/QuickActions.tsx))
- Virtual card preview

### Top-up ([app/app/topup/page.tsx](app/app/topup/page.tsx))
- Four funding sources: bank transfer, MTN MoMo, Airtel Money, cash deposit
- Quick-amount chips (RWF 5K – 500K) plus free-entry amount
- Posts to `/api/deposits` — credits the account, writes a `transfer_in` transaction

---

## 3. Transactions

### Transaction list ([app/app/transactions/page.tsx](app/app/transactions/page.tsx))
- Paginated, searchable, filterable history (merchant, amount, date, category)
- Per-row merchant info, category chip, amount, status chip ([components/TransactionRow.tsx](components/TransactionRow.tsx))
- Seeded fixtures: ~30 historical charges, plus the two duplicate Simba Supermarket charges and the AliExpress fraud charge that drive demo scenes

### Transaction detail ([app/app/transactions/\[id\]](app/app/transactions/[id]/))
- Bottom-sheet detail view with raw + formatted metadata ([components/TransactionDetail.tsx](components/TransactionDetail.tsx))
- Inline refund flow that opens an OTP modal and calls `/api/refunds` ([components/RefundFlow.tsx](components/RefundFlow.tsx))

---

## 4. Cards

### Card management ([app/app/cards](app/app/cards/))
- Virtual card visual with reveal-to-see-number toggle ([components/VirtualCard.tsx](components/VirtualCard.tsx))
- Card detail page with status chip (`active` / `frozen` / `terminated`)
- Freeze / unfreeze toggle wired to `/api/cards/[id]/freeze` and `/api/cards/[id]/unfreeze`
- Replace card action → `/api/cards/[id]/replace` (terminates and reissues)
- Mock Flutterwave card-provider wrapper for create / freeze / unfreeze / terminate / refund / chargeback ([lib/card-provider.ts](lib/card-provider.ts), [lib/flutterwave.ts](lib/flutterwave.ts))

---

## 5. Payments & Transfers

### Transfers ([app/app/transfers](app/app/transfers/))
- Send-money form with recipient + amount ([components/TransferForm.tsx](components/TransferForm.tsx))
- Posts to `/api/transfers` — debits the sender's account, writes a `transfer_out` transaction
- Transfer detail page

### Bill pay
- Electricity (e.g., EUCL prepaid) — meter number + amount → token returned ([components/ElectricityForm.tsx](components/ElectricityForm.tsx), [app/api/services/electricity](app/api/services/electricity/))
- Airtime top-up — phone + carrier + amount ([components/AirtimeForm.tsx](components/AirtimeForm.tsx), [app/api/services/airtime](app/api/services/airtime/))
- Pay hub at [app/app/pay](app/app/pay/)

---

## 6. Settings

### Settings hub ([app/app/settings/page.tsx](app/app/settings/page.tsx))

### Limits ([app/app/settings/limits](app/app/settings/limits/))
- Current daily / monthly / single-transaction / ATM limits ([components/LimitsPanel.tsx](components/LimitsPanel.tsx))
- "Request increase" CTA — entry point to the Lira limit-increase scene (writes to `limit_requests` collection)

### KYC status ([app/app/settings/kyc](app/app/settings/kyc/))
- Current verification state, history of attempts

### Security ([app/app/settings/security](app/app/settings/security/))
- MFA, password, sessions shells

### Notifications ([app/app/settings/notifications](app/app/settings/notifications/))

---

## 7. Fake Mailbox (for the fraud-dispute scene)

### Inbox ([app/app/inbox](app/app/inbox/))
- Firestore-backed mailbox: renders `emails` filtered to the current user ([components/EmailThread.tsx](components/EmailThread.tsx))
- Threaded view with read/unread state and live `onSnapshot` updates
- Compose modal locked to `support@lemonpay.rw` ([components/ComposeEmail.tsx](components/ComposeEmail.tsx), [app/app/inbox/compose](app/app/inbox/compose/))
- Sends create `outbound` email docs; Lira backend replies as `inbound` docs in the same thread

---

## 8. OTP & Step-Up Auth

- `POST /api/otp/send` — generates a 6-digit code, bcrypt-hashes it, sends via Africa's Talking SMS, rate-limited to 3/hour per user
- `POST /api/otp/verify` — bcrypt compare; issues a short-lived JWT verification token consumed by money-moving endpoints ([lib/otp-token.ts](lib/otp-token.ts))
- 5-attempt lockout on the OTP, 5-minute expiry
- OTP modal component used by the refund flow ([components/OtpModal.tsx](components/OtpModal.tsx))
- Africa's Talking wrapper ([lib/africastalking.ts](lib/africastalking.ts))

---

## 9. Disputes & Refunds

### Refunds (`POST /api/refunds`)
- Requires OTP verification token (or Lira approval token for amounts > RWF 250,000)
- Idempotency-Key required, format `refund:{tx}:{conversation}`
- Updates the source transaction to `refunded`, posts a new `refund`-type transaction, credits the account
- Mock Flutterwave refund call

### Disputes (`POST /api/disputes`)
- Reasons: fraud, duplicate, not_received, wrong_amount
- Idempotency-Key required
- On `fraud` reason: auto-freezes the card and triggers replacement
- Creates `disputes/{id}` and flips the transaction to `disputed`

---

## 10. Endpoints (Vercel Serverless Functions)

Every endpoint goes through shared middleware ([lib/api-helpers.ts](lib/api-helpers.ts)): Firebase ID-token auth, Zod body validation ([lib/schemas.ts](lib/schemas.ts)), idempotency-key check on money-moving routes, `api_logs` write with PII redaction, standard `{ok, data}` / `{ok, error}` envelope.

| Endpoint | Purpose |
|---|---|
| `POST /api/cards/[id]/freeze` | Freeze card |
| `POST /api/cards/[id]/unfreeze` | Reactivate card |
| `POST /api/cards/[id]/replace` | Terminate + reissue card |
| `POST /api/refunds` | Refund a transaction (OTP-gated) |
| `POST /api/disputes` | File chargeback; fraud auto-freezes + replaces |
| `POST /api/otp/send` | Send 6-digit OTP via SMS |
| `POST /api/otp/verify` | Verify OTP, return JWT |
| `POST /api/kyc/submit` | Run mocked KYC, update user status |
| `POST /api/webhooks/flutterwave` | Receive payment events (signature-verified) |
| `POST /api/admin/reset` | Demo state restore (token-gated) |
| `POST /api/deposits` | Top-up an account |
| `POST /api/transfers` | Send money |
| `POST /api/services/electricity` | Prepaid electricity purchase |
| `POST /api/services/airtime` | Airtime top-up |

Flutterwave webhooks handled: `charge.completed`, `refund.completed`, `chargeback.created`, `chargeback.resolved`.

---

## 11. Lira Support Widget

- Shared client bootstrap in [lib/lira-client.ts](lib/lira-client.ts) — loads `widget.liraintelligence.com/v1/widget.js` (with `data-position="bottom-right"`, so the floating launcher auto-mounts), then drives the JS SDK (`window.Lira.init` → `identify` → `setContext`)
- Root layout ([app/layout.tsx](app/layout.tsx)) injects the widget script via `next/script` with `data-position="bottom-right"`, so the floating launcher renders on every page — landing page, login, signup, all of `/app/*` — anonymous before sign-in, identified after
- [components/LiraProvider.tsx](components/LiraProvider.tsx) is mounted in the authenticated app shell ([app/app/layout.tsx](app/app/layout.tsx)) — once the user is loaded it calls `identify` + `setContext({ route, account })` on the existing session, and refreshes context on every route change
- [components/LiraWidget.tsx](components/LiraWidget.tsx) is mounted on [app/app/help](app/app/help/) — calls `mountSupportPage("#lira-support-root")` for the fullscreen embed
- Server-signed identity: `POST /api/lira/identity` ([app/api/lira/identity/route.ts](app/api/lira/identity/route.ts)) returns `{ email, name, sig }` where `sig = HMAC-SHA256(LIRA_WIDGET_SECRET, email)`. Secret stays in Secret Manager — never reaches the browser
- AI actions registered with `Lira.registerAction`: `navigate.goto` (router push), `account.topup` (calls `/api/deposits`) — Lira's agent can invoke these from chat to actually move state in the app
- Org id (`NEXT_PUBLIC_LIRA_ORG_ID`) is public; the widget secret stays server-side

---

## 12. Data Model (Firestore)

Eleven root collections: `users`, `accounts`, `cards`, `transactions`, `merchant_locks`, `kyc_attempts`, `disputes`, `limit_requests`, `emails`, `otp_codes`, `api_logs`. Schemas in [lib/types.ts](lib/types.ts).

Composite indexes ([firestore.indexes.json](firestore.indexes.json)):
- `transactions`: `user_id ASC, posted_at DESC`
- `transactions`: `user_id ASC, merchant_id ASC, posted_at DESC`
- `emails`: `user_id ASC, sent_at DESC`
- `cards`: `user_id ASC, status ASC`

Security rules ([firestore.rules](firestore.rules)) default-deny on server-managed collections (cards, transactions, disputes, kyc_attempts, otp_codes, api_logs); owner-scoped reads for user data; owner-scoped creates for `merchant_locks`, outbound `emails`, and `limit_requests`.

---

## 13. Demo Infrastructure

### Seed data ([seed/](seed/))
- Five customers with deterministic personas: Lola (active, demo protagonist), Marcus (KYC-stuck), Priya (limit-request pending), Diego, Sarah ([seed/customers.ts](seed/customers.ts))
- ~30 historical transactions per protagonist with the scripted edge cases pre-planted: two identical Simba Supermarket charges and a 03:00 UTC AliExpress charge from an unknown device fingerprint ([seed/transactions.ts](seed/transactions.ts))
- Specialty fixtures: Marcus's failed KYC attempt, Priya's pending `limit_requests` doc, pre-drafted inbox emails ([seed/specialty.ts](seed/specialty.ts))
- Runnable via `npm run seed`

### Demo reset
- `POST /api/admin/reset` — token-gated (`DEMO_RESET_TOKEN`), truncates user-scoped collections, re-runs seed
- Admin reset screen at [app/admin/reset](app/admin/reset/)

### Smoke tests
- `npm run smoke:services` — external service wrappers (Flutterwave mock, Africa's Talking, KYC mock)
- `npm run smoke:endpoints` — every endpoint hit with a real Firebase ID token

---

## 14. UI Chrome

- Mobile-frame responsive layout — looks like a phone in a desktop browser, native on mobile
- Top nav + bottom tabs ([components/MobileHeader.tsx](components/MobileHeader.tsx), [components/BottomTabs.tsx](components/BottomTabs.tsx), [components/SidebarNav.tsx](components/SidebarNav.tsx))
- Page header primitive ([components/PageHeader.tsx](components/PageHeader.tsx))
- shadcn/ui primitives under [components/ui/](components/ui/)
- Lemon-wedge logo SVG ([components/LemonLogo.tsx](components/LemonLogo.tsx))
- Sonner toasts on freeze / unfreeze / refund / dispute actions
- Coming-soon page for unbuilt routes ([components/ComingSoonPage.tsx](components/ComingSoonPage.tsx))

---

## 15. Hosting & Configuration

- Next.js 16 (App Router), React 19, TypeScript everywhere
- Firebase App Hosting via [apphosting.yaml](apphosting.yaml); Firebase config in [firebase.json](firebase.json)
- Server routes lazy-init the Admin SDK and are marked `force-dynamic` to keep the App Hosting build green
- Tailwind v4 + shadcn/ui for styling
- Zod 4 at every API boundary

---

## 16. Explicitly Out of Scope

Native mobile apps; real ACH / RTGS / MTN MoMo settlement; multi-language; real SMTP for inbox; real KYC vendor (Smile ID / Youverify swap-in); physical card production; multi-tenancy; marketing site beyond a single landing page.
