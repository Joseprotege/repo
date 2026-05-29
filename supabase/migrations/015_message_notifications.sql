-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 015: Notify the other participant on new task messages
-- Covers free-form DMs and step responses. The lister and the accepted helper
-- each get a bell notification when the other one writes, so activity on a task
-- reaches users even when they're not on the chat screen.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_task_message()
RETURNS TRIGGER AS $$
DECLARE
  v_lister_id   uuid;
  v_helper_id   uuid;
  v_recipient   uuid;
  v_title       text;
  v_sender_name text;
  v_preview     text;
BEGIN
  -- Only DMs and step responses are worth a notification.
  IF NEW.type NOT IN ('dm', 'step_response') THEN
    RETURN NEW;
  END IF;

  -- Resolve both participants from the offer.
  SELECT l.user_id, o.user_id, l.title
    INTO v_lister_id, v_helper_id, v_title
  FROM public.offers o
  JOIN public.listings l ON l.id = o.listing_id
  WHERE o.id = NEW.offer_id;

  -- Recipient is whichever participant is NOT the sender.
  IF NEW.sender_id = v_lister_id THEN
    v_recipient := v_helper_id;
  ELSE
    v_recipient := v_lister_id;
  END IF;

  IF v_recipient IS NULL OR v_recipient = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, username, 'Someone')
    INTO v_sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  v_preview := left(COALESCE(NULLIF(NEW.content, ''), 'New message'), 80);

  INSERT INTO public.notifications (user_id, title, body, type, link_to, read)
  VALUES (
    v_recipient,
    COALESCE(v_sender_name, 'New message') || ' messaged you',
    '"' || v_title || '": ' || v_preview,
    'message',
    '/chat/' || NEW.offer_id,
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_task_message ON public.task_messages;
CREATE TRIGGER trg_task_message
  AFTER INSERT ON public.task_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_task_message();

-- Make sure notifications stream over Realtime so the bell updates live.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
