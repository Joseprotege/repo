# Supabase Setup Guide

This document walks you through connecting Foster to a real Supabase backend.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New project**
3. Choose a name (e.g. "foster"), set a strong database password, pick the region closest to your users
4. Wait ~2 minutes for the project to spin up

## 2. Run the database migrations

In your Supabase project, click **SQL Editor** in the left sidebar, then run each migration file in order:

1. Paste and run: `supabase/migrations/001_initial_schema.sql`
2. Paste and run: `supabase/migrations/002_rls_policies.sql`
3. Paste and run: `supabase/migrations/003_auto_profile.sql`

## 3. Get your API credentials

Go to **Settings → API** in your Supabase project. You need:
- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon/public key** — the long `eyJ...` string under "Project API keys"

## 4. Configure your local environment

In the `lend/` folder, create a file called `.env.local`:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Never commit this file — it's already in `.gitignore`.

## 5. Enable email auth

In your Supabase project: **Authentication → Providers → Email** — make sure it's enabled.

For development, go to **Authentication → Email Templates** and optionally disable email confirmation so you can test sign-up without email verification.

## 6. Run the app

```bash
npm run dev
```

The `/login` and `/signup` routes are now live. New users who sign up will automatically get a profile row created via the trigger in `003_auto_profile.sql`.

## 7. Storage (for listing images)

To enable listing photo uploads:
1. Go to **Storage** in your Supabase project
2. Create a new bucket called `listing-images`
3. Set it to **Public**
4. Update the bucket policy to allow authenticated users to upload

## What's still mock data

The app still uses mock data for the UI components (listings, users, etc.) until you wire the service layer functions in `src/services/` into the React components. The services are fully built — they just need to replace the mock imports one page at a time.

## Next step: replace mock data

To replace mock data for listings on the Browse page, for example:
1. Import `fetchOpenListings` from `../services/listings`
2. Use `useEffect` to call it and store results in state
3. Replace the `listings` variable from context with the real data

Start with one page, verify it works, then do the next.
