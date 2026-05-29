-- Migration 016: Step approval flow
-- Adds 'step_approved' message type so the lister can unlock steps,
-- and updates the message notification trigger to also notify on step_response.

-- Expand the type check to include step_approved
ALTER TABLE public.task_messages
  DROP CONSTRAINT IF EXISTS task_messages_type_check;

ALTER TABLE public.task_messages
  ADD CONSTRAINT task_messages_type_check CHECK (type IN (
    'step_response',
    'step_approved',
    'dm',
    'system',
    'voice_request',
    'voice_accept',
    'voice_decline'
  ));

-- Update the message notification trigger from migration 015 to also
-- notify on step_approved (lister sending approval to helper).
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
  IF NEW.type NOT IN ('dm', 'step_response', 'step_approved') THEN
    RETURN NEW;
  END IF;

  SELECT l.user_id, o.user_id, l.title
    INTO v_lister_id, v_helper_id, v_title
  FROM public.offers o
  JOIN public.listings l ON l.id = o.listing_id
  WHERE o.id = NEW.offer_id;

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

  v_preview := CASE
    WHEN NEW.type = 'step_approved' THEN 'Approved your step — next step is unlocked!'
    ELSE left(COALESCE(NULLIF(NEW.content, ''), 'New message'), 80)
  END;

  INSERT INTO public.notifications (user_id, title, body, type, link_to, read)
  VALUES (
    v_recipient,
    CASE
      WHEN NEW.type = 'step_response' THEN 'Step response from helper'
      WHEN NEW.type = 'step_approved' THEN 'Step approved!'
      ELSE COALESCE(v_sender_name, 'Someone') || ' messaged you'
    END,
    '"' || v_title || '": ' || v_preview,
    'message',
    '/chat/' || NEW.offer_id,
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
