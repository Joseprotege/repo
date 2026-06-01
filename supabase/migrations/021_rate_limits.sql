-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 021: Per-user rate limiting (server-side, bypass-proof)
--
-- A single generic BEFORE INSERT trigger function counts how many rows the
-- acting user has created in a recent time window and rejects the insert if it
-- exceeds the cap. Because it runs in the database it applies no matter how the
-- write arrives (app, raw REST call, script).
--
-- Trigger args: (user_column, max_count, window_interval)
--   e.g. ('user_id', '10', '1 hour') → max 10 rows/hour per user.
--
-- service_role inserts (Edge Functions, webhook) are exempt — none of the
-- rate-limited tables are written server-side, and exempting the elevated role
-- keeps trusted automation from ever tripping a user-facing limit.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_col text     := TG_ARGV[0];
  v_max      int      := TG_ARGV[1]::int;
  v_window   interval := TG_ARGV[2]::interval;
  v_user     uuid;
  v_count    int;
BEGIN
  -- Trusted server-side role bypasses user rate limits entirely.
  IF current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_user := (to_jsonb(NEW) ->> v_user_col)::uuid;
  IF v_user IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format(
    'SELECT count(*) FROM public.%I WHERE %I = $1 AND created_at > now() - $2',
    TG_TABLE_NAME, v_user_col
  ) INTO v_count USING v_user, v_window;

  IF v_count >= v_max THEN
    RAISE EXCEPTION
      'Rate limit reached: too many actions in a short time. Please wait a bit and try again.'
      USING errcode = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- ── Triggers ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_rate_limit_listings ON public.listings;
CREATE TRIGGER trg_rate_limit_listings
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('user_id', '10', '1 hour');

DROP TRIGGER IF EXISTS trg_rate_limit_offers ON public.offers;
CREATE TRIGGER trg_rate_limit_offers
  BEFORE INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('user_id', '20', '1 hour');

DROP TRIGGER IF EXISTS trg_rate_limit_messages ON public.task_messages;
CREATE TRIGGER trg_rate_limit_messages
  BEFORE INSERT ON public.task_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('sender_id', '30', '1 minute');

DROP TRIGGER IF EXISTS trg_rate_limit_broadcasts ON public.community_broadcasts;
CREATE TRIGGER trg_rate_limit_broadcasts
  BEFORE INSERT ON public.community_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('sender_id', '5', '1 hour');

DROP TRIGGER IF EXISTS trg_rate_limit_reports ON public.reports;
CREATE TRIGGER trg_rate_limit_reports
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('reporter_id', '10', '1 hour');
