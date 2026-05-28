ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS budget_cents int DEFAULT 0;
