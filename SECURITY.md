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

## 🔴 REQUIRED before launch — credential rotation

These were exposed in chat/working sessions during development and **must be
rotated** before any real users touch the system:

- [ ] **Supabase access token** `sbp_...` — Supabase → Account → Access Tokens →
      revoke. (CLI-only token; revoking does not affect the running app.)
- [ ] **Stripe secret key** — Stripe → Developers → API keys → roll the secret
      key, then update `STRIPE_SECRET_KEY` in Supabase Edge Function secrets.
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

## Webhook scope (known item)

The Stripe webhook must use the **"Connected accounts"** event scope (not just
"Your account") so helper `account.updated` events arrive. See prior notes.
