-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 023: Transactional email via Resend
--
-- Adds a pg_net trigger that fires after every INSERT on public.notifications
-- and calls the send-email edge function so users receive email notifications
-- even when they're not actively in the app.
--
-- Prerequisites (run ONCE in Supabase SQL editor after applying this migration):
--
--   ALTER DATABASE postgres
--     SET app.edge_function_base_url = 'https://<your-project-ref>.supabase.co/functions/v1';
--
--   ALTER DATABASE postgres
--     SET app.internal_email_secret = '<same value as INTERNAL_EMAIL_SECRET Supabase secret>';
--
-- Required Supabase secrets (Dashboard → Edge Functions → send-email → Secrets):
--   RESEND_API_KEY          — API key from resend.com
--   INTERNAL_EMAIL_SECRET   — the same random string set above
--   APP_URL                 — your production domain, e.g. https://foster.vercel.app
--   EMAIL_FROM              — sender address, e.g. Foster <hello@yourdomain.com>
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.email_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_base_url text;
  v_secret   text;
  v_email    text;
BEGIN
  v_base_url := current_setting('app.edge_function_base_url', true);
  v_secret   := current_setting('app.internal_email_secret',  true);

  -- Silently skip if not configured (local dev / CI).
  IF v_base_url IS NULL OR v_base_url = '' OR
     v_secret   IS NULL OR v_secret   = '' THEN
    RETURN NEW;
  END IF;

  -- Resolve the recipient's email from auth.users.
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
  IF v_email IS NULL THEN RETURN NEW; END IF;

  -- Fire-and-forget HTTP POST — pg_net queues the request asynchronously
  -- so it never blocks the transaction that inserted the notification.
  PERFORM extensions.http_post(
    url     := v_base_url || '/send-email',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object(
      'to',                v_email,
      'subject',           NEW.title,
      'notification_body', NEW.body,
      'link_to',           COALESCE(NEW.link_to, '/dashboard'),
      'type',              NEW.type
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_on_notification ON public.notifications;
CREATE TRIGGER trg_email_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.email_on_notification();
