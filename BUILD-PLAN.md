# Lemonpay — Build Plan (A to Z)

> Tactical, ordered checklist for building Lemonpay end to end. Each phase has a clear exit criterion. Don't move to the next phase until the current one's milestone is met.

---

## Phase 0 — Project Bootstrap

**Goal:** A blank Next.js app deployed to Vercel that says "Lemonpay" on screen.

- [ ] `npx create-next-app@latest lemonpay --typescript --tailwind --app --eslint`
- [ ] Install deps: `firebase`, `firebase-admin`, `zod`, `bcryptjs`, `africastalking`, `@types/bcryptjs`
- [ ] Install shadcn/ui: `npx shadcn@latest init`, then add `button`, `card`, `input`, `dialog`, `sheet`, `badge`, `tabs`, `toast`
- [ ] Create Firebase project in console → enable Firestore (production mode), Auth (Email/Password), Storage
- [ ] Create Vercel project, link to GitHub repo
- [ ] Create `.env.local` with all keys from spec §9.4 (use placeholder Flutterwave/AT keys for now)
- [ ] Push to GitHub, verify auto-deploy works
- [ ] Set up folder structure per spec §9.2

**Exit:** `https://lemonpay.vercel.app` loads with placeholder home page.

---

## Phase 1 — Data Foundation

**Goal:** Firestore has Lola's seed data, security rules are deployed, Auth works.

- [ ] Define TypeScript types for all 11 collections in `lib/types.ts` (mirror spec §6 exactly)
- [ ] Write `lib/firebase-client.ts` (client SDK init) and `lib/firebase-admin.ts` (Admin SDK)
- [ ] Write `firestore.rules` from spec §8.2, deploy via Firebase CLI
- [ ] Write `firestore.indexes.json` with composite indexes from spec §6
- [ ] Write `seed/customers.ts` — just **Lola** for now (full user + account + 1 virtual card)
- [ ] Write `seed/transactions.ts` — Lola's ~30 historical transactions + 2 duplicate Simba charges + AliExpress fraud charge
- [ ] Write `seed/run-seed.ts` — invokable as a standalone script (`tsx seed/run-seed.ts`) for now; we'll wire it into `/api/admin/demo-reset` later
- [ ] Run seed once manually, verify in Firebase console
- [ ] Wire Firebase Auth on `/signup` and `/login` (email + password only)
- [ ] Add Lola as a Firebase Auth user manually in console; map her UID to the seeded `users/{uid}` doc

**Exit:** Sign in as Lola, see her UID match a Firestore doc.

---

## Phase 2 — Core Screens (Read-Only)

**Goal:** Lola can log in and see her balance, transactions, and card — all live from Firestore.

- [ ] Build `app/app/layout.tsx` — authenticated wrapper, redirects to `/login` if no session
- [ ] Build `<TopNav />` and `<BottomTabs />` chrome
- [ ] Build `<BalanceCard />` — subscribes to `accounts/{accountId}` via `onSnapshot`
- [ ] Build `/app` home page — balance + 3 recent transactions + quick actions (buttons are no-ops for now)
- [ ] Build `<TransactionRow />` and `/app/transactions` — paginated list with filters
- [ ] Build `<TransactionDetail />` bottom sheet, `/app/transactions/:id`
- [ ] Build `<VirtualCard />` component
- [ ] Build `/app/cards` list and `/app/cards/:id` detail (freeze toggle disabled for now)
- [ ] Build `/app/settings` hub + settings sub-pages as static shells
- [ ] Verify mobile-frame responsive styling (spec wants it to look like a phone in a browser)

**Exit:** Cold-load `/app` as Lola, see real seeded data on every screen.

---

## Phase 3 — External Service Wrappers

**Goal:** Thin, tested clients for each external dependency.

- [ ] Sign up for Flutterwave test account, get test keys, drop into `.env.local`
- [ ] Write `lib/flutterwave.ts` — wrapper for: create virtual card, freeze, unfreeze, terminate, refund, file chargeback
- [ ] Create one virtual card via Flutterwave dashboard or wrapper for Lola, store its `flutterwave_card_id` in her `cards` doc
- [ ] Sign up for Africa's Talking sandbox, get API key
- [ ] Write `lib/africastalking.ts` — send SMS wrapper
- [ ] Write `lib/kyc-mock.ts` per spec §10.3 (deterministic for Marcus, random 80/20 otherwise)
- [ ] Write `lib/schemas.ts` — Zod schemas for every endpoint body in spec §7

**Exit:** Each wrapper has a smoke test (run as a script) that proves it talks to the real service.

---

## Phase 4 — Endpoints (Money & State)

**Goal:** All 10 endpoints from spec §7 working, with auth, validation, idempotency, logging.

- [ ] Write shared `lib/api-helpers.ts`: auth middleware (verify Firebase ID token), idempotency check (uses a `idempotency_keys` Firestore collection), api_logs writer, standard `{ok, data}` / `{ok, error}` response helpers
- [ ] `POST /api/cards/[id]/freeze`
- [ ] `POST /api/cards/[id]/unfreeze`
- [ ] `POST /api/cards/[id]/replace`
- [ ] `POST /api/otp/send` (with 3/hour rate limit)
- [ ] `POST /api/otp/verify` (issues short-lived JWT)
- [ ] `POST /api/refunds` (requires OTP token or Lira approval for >RWF 250K)
- [ ] `POST /api/disputes` (auto-freezes + replaces card on fraud reason)
- [ ] `POST /api/kyc/submit`
- [ ] `POST /api/webhooks/flutterwave` (signature verification)
- [ ] `POST /api/admin/demo-reset` (token-gated, calls seed)
- [ ] Wire freeze toggle on `/app/cards/:id` to actually call `/api/cards/:id/freeze`

**Exit:** Each endpoint has been hit successfully via Postman/curl with a real Firebase ID token; freeze toggle in the UI flips Lola's card status.

---

## Phase 5 — Specialty Screens

**Goal:** The screens that exist only to support specific demo scenes.

- [ ] Add **Marcus**, **Priya**, **Diego**, **Sarah** to seed (run-seed.ts)
- [ ] Add Marcus's failed KYC attempt + Priya's pending limit_request to seed
- [ ] Build `<KycStepper />` + `<PhotoCapture />` for `/signup/kyc`
- [ ] Build `/signup/pending` with live `onSnapshot` on user status
- [ ] Build `<EmailThread />` + `<ComposeEmail />` for `/app/inbox/*`
- [ ] Build `<LimitsPanel />` for `/app/settings/limits` with "Request increase" CTA
- [ ] Build `<CardControls />` for `/app/cards/:id/controls` (category locks, geo locks, merchant allow-list)
- [ ] Build `<OtpModal />` and wire to refund flow

**Exit:** Each of the 5 demo scenes is at least walkable manually (without Lira yet) — every screen renders the right state.

---

## Phase 6 — Lira Widget Integration

**Goal:** The floating chat button is present on every authenticated page and opens a panel.

- [ ] Build `<LiraWidgetAnchor />` — floating button bottom-right + slide-up Sheet
- [ ] Add the Lira widget `<script>` tag to `app/app/layout.tsx`
- [ ] Verify the widget bundle loads (we may stub the actual Lira backend WebSocket connection if it isn't ready — confirm scope with Lira team)
- [ ] Confirm the widget can be pre-loaded with a message (for the "Request increase" CTA flow)

**Exit:** Widget button visible on every `/app/*` page, opens panel on click.

---

## Phase 7 — Demo Reset & State Restoration

**Goal:** One button restores the entire demo to a clean state in under 3 seconds.

- [ ] Wire `seed/run-seed.ts` into `/api/admin/demo-reset` (truncate user-scoped collections, then re-seed)
- [ ] Add Flutterwave test-mode card state restoration (unfreeze, clear any test refunds)
- [ ] Add hidden `Ctrl+Shift+R` keyboard handler to Lira admin dashboard (coordinate with Lira team) to call this endpoint
- [ ] Benchmark: full reset should complete in <3s

**Exit:** Run demo end-to-end, hit reset, run it again identically.

---

## Phase 8 — Polish

**Goal:** Visually convincing, presentation-grade.

- [ ] Branding pass: lemon yellow `#FFEB3B`-ish accent, deep charcoal background, white surfaces
- [ ] Lemon-wedge logo SVG in `public/logo.svg`
- [ ] Marketing landing page (`/`) — one screen, clean
- [ ] Mobile-frame chrome on `/app/*` (looks like a phone in a browser)
- [ ] Loading states + skeletons on all data fetches
- [ ] Empty states for transactions, inbox
- [ ] Fallback dialogue scripts in a fixture file (in case Flutterwave or AT is down mid-demo)
- [ ] Toast notifications for actions (freeze/unfreeze/refund)

**Exit:** Show it to someone unfamiliar with the project; they call it "polished."

---

## Phase 9 — Dress Rehearsals

**Goal:** Salesperson can run the 25-minute demo from cold start without touching code.

- [ ] Write demo runbook (per spec §14)
- [ ] Dress rehearsal #1 — note every glitch
- [ ] Fix glitches
- [ ] Dress rehearsal #2 — same
- [ ] Dress rehearsal #3 — final
- [ ] Cold-start warmup script: hit each endpoint once before each real demo

**Exit:** Three consecutive clean runs.

---

## Cross-Cutting Rules (apply throughout)

- **No secrets in client code.** Anything sensitive lives in env vars and is only read server-side.
- **Zod-validate every endpoint body.** No exceptions.
- **Idempotency keys required on money-moving endpoints.** Refunds and disputes especially.
- **Write to `api_logs` from every endpoint.** Redact PII (national IDs, full phone, PANs).
- **All client reads via `onSnapshot` where reactivity matters** (balance, KYC status, inbox).
- **Security rules first, then code.** When adding a new collection, write the rule before writing the page.
- **One PR per phase exit.** Keeps review focused.

---

## What We're Deliberately Not Doing

(From spec §15 — re-stating so we don't drift)

Native mobile apps, real ACH/MoMo, multi-language, real SMTP, real KYC vendor, physical card production, marketing site beyond one page, multi-tenancy.

---

## Open Questions to Resolve Before Starting

1. Is the Lira widget bundle/backend ready, or do we stub it during Phase 6?
2. Has `LEMONPAY` been registered as an Africa's Talking alphanumeric sender ID? (Takes 1–3 business days — start now if not.)
3. Are there shared design assets (logo, brand colors exact hex codes) or do we generate them?
4. Who owns the Flutterwave test account credentials?
5. Production deployment URL — `lemonpay.vercel.app` or a custom domain?
