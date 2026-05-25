-- Extend listings with all fields the app uses
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS preferred_radius_miles float  DEFAULT 15,
  ADD COLUMN IF NOT EXISTS tags                  text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS can_be_remote         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_hours       float   DEFAULT 2,
  ADD COLUMN IF NOT EXISTS views                 int     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accepted_offer_id     uuid,        -- no FK — avoids circular reference
  ADD COLUMN IF NOT EXISTS expires_at            timestamptz;

-- Extend offers with all fields the app uses
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS completion_type            text    DEFAULT 'assist',
  ADD COLUMN IF NOT EXISTS estimated_hours            float   DEFAULT 2,
  ADD COLUMN IF NOT EXISTS updated_at                 timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS rating_by_requester        int     CHECK (rating_by_requester BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_by_helper           int     CHECK (rating_by_helper BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_note_by_requester   text,
  ADD COLUMN IF NOT EXISTS rating_note_by_helper      text,
  ADD COLUMN IF NOT EXISTS distance_miles             float,
  ADD COLUMN IF NOT EXISTS return_favor_pending       boolean DEFAULT false;

-- Extend profiles with verification flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_email boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_id    boolean DEFAULT false;

-- Extend reliability_scores with avg rating + reliable offers
ALTER TABLE public.reliability_scores
  ADD COLUMN IF NOT EXISTS avg_rating       float DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reliable_offers  int   DEFAULT 0;

-- Updated_at trigger for offers (already exists for listings)
DROP TRIGGER IF EXISTS offers_updated_at ON public.offers;
CREATE TRIGGER offers_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
