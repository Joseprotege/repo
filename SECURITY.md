# Foster — Security Posture & Launch Checklist

This document tracks Foster's security model and the actions required before a
public launch. Updated as part of the pre-launch security audit.

## Architecture summary

- **Frontend** (Vite/React) ships only **public** values: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`. These are safe to be
  in the browser bundle. The anon key is gated by Row Level Security.
- **Secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`) live **only** in Supabase Edge Function env vars and
  are read via `Deno.env`. They never reach the browser. ✅ Verified — no
  hardcoded secrets in source, `.env*` is gitignored.
- **Money movement** runs server-side in Edge Functions:
  - `stripe-create-payment-intent` — verifies the caller is the listing's
    requester before creating a manual-capture PaymentIntent. ✅
  - `stripe-release-payment` — verifies caller == requester, state == `held`. ✅
  - `stripe-webhook` — verifies Stripe's signature (`constructEventAsync`). ✅
  - `stripe-onboard-helper` — only operates on the caller's own profile. ✅
- Edge Functions log full errors server-side but return **generic** messages to
  clients (no internal/DB detail leakage). ✅
- **Frontend security headers** (Vercel): CSP, HSTS, X-Frame-Options DENY,
  nosniff, Referrer-Policy, Permissions-Policy. ✅ See `lend/vercel.json`.

## Credential rotation

These were exposed in chat/working sessions during development and have now been
rotated:

- [x] **Supabase access token** `sbp_...` — old leaked token (`sbp_1dfd…`) no
      longer present in Account → Access Tokens; remaining active CLI token was
      never shared. (CLI-only token; deleting does not affect the running app.)
- [x] **Stripe secret key** — rolled in Stripe → Developers → API keys; new
      value updated in Supabase Edge Function secrets as `STRIPE_SECRET_KEY`.
- [ ] **Switch Stripe from test mode to live keys** when ready for real money,
      and update the webhook endpoint + `STRIPE_WEBHOOK_SECRET` accordingly.

## Supabase project settings to verify (dashboard)

- [ ] **Auth → email confirmation ON** (prevents fake/unverified signups).
- [ ] **Auth → leaked-password protection ON** (HaveIBeenPwned check).
- [ ] **Auth → rate limits** reviewed (signups, OTP, password reset).
- [ ] **Set `ALLOWED_ORIGINS`** awareness: CORS on Edge Functions is currently
      `*`. The real gate is the JWT/owner check (present), but for defense in
      depth, consider restricting once the production domain is fixed.
- [ ] Confirm **RLS is enabled on every table** (see migration 002) — tracked in
      the RLS hardening pass (phase 2).

## Phase 2 — RLS / data-privacy hardening (done)

Migrations 018 + 019 closed six over-permissive policies. See migration headers
for full rationale. Summary:

- `payment_requests` UPDATE restricted to requester (helpers had write access).
- `reliability_scores` user self-UPDATE removed (only the SECURITY DEFINER
  trigger may write scores).
- `offers` UPDATE split into lister vs helper policies — helper can no longer
  self-accept / self-complete; helper UPDATE locked to `completed` rows only.
- `profiles` UPDATE column-locked: Stripe + verification flags now writable only
  by service_role (the webhook).
- `notifications` UPDATE column-locked to the `read` column.
- `task_messages` INSERT now requires the offer to be `accepted`/`completed`.

## Phase 3 — abuse & spam prevention (done)

Defense lives in the database so it can't be bypassed by hitting the REST API
directly with the anon key.

- **Content length caps** (migration 020): `CHECK` constraints on every
  free-text / array / jsonb column (listings, offers, task_messages,
  broadcasts, reports, profiles). Generous limits — they stop megabyte payloads,
  not normal input. Added `NOT VALID` so they never fail on legacy rows.
- **Per-user rate limits** (migration 021): generic `enforce_rate_limit()`
  BEFORE INSERT trigger. Caps: listings 10/hr, offers 20/hr, messages 30/min,
  broadcasts 5/hr, reports 10/hr. service_role is exempt.
- **Frontend caps**: `lend/src/lib/limits.ts` centralizes UI `maxLength` values
  (always ≤ the DB caps) so users get friendly counters instead of DB errors.
- **XSS**: confirmed no `dangerouslySetInnerHTML` / `innerHTML` anywhere — React
  escapes all rendered user content, so stored content is not an injection vector.

## Phase 4 — launch-readiness polish (in progress)

- **User-facing errors**: write services now surface real failures via a toast
  bus (`lib/notify.ts` + `components/common/Toaster.tsx`). DB rate-limit and
  constraint messages are mapped to friendly text in `lib/errors.ts` and shown
  to the user instead of failing silently.
- **Crash safety**: root `ErrorBoundary` (`components/common/ErrorBoundary.tsx`)
  shows a recovery screen instead of a blank page; it's the hook point for an
  error-monitoring service (Sentry) later.
- **Helper earnings**: new Earnings tab on the Dashboard
  (`components/user/EarningsPanel.tsx` + `fetchHelperEarnings()`), showing total
  paid out, escrow-held, paid-task count, and payout history.
- **Code-splitting**: routes are lazy-loaded — initial JS bundle dropped from
  ~708 KB to ~535 KB (193 → 154 KB gzipped); each page loads on demand.

Remaining for launch: optional Sentry wiring (needs a DSN), final mobile QA pass.

## Webhook scope (known item)

The Stripe webhook must use the **"Connected accounts"** event scope (not just
"Your account") so helper `account.updated` events arrive. See prior notes.
