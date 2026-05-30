-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 017: Payment lifecycle notifications
-- Notifies both parties when escrow is funded (held) and when it's released.
-- Fires regardless of whether the status change came from the client or the
-- Stripe webhook/Edge Function (both update payment_requests.status).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_payment_change()
RETURNS TRIGGER AS $$
DECLARE
  v_title    text;
  v_payout   text;
  v_amount   text;
BEGIN
  SELECT title INTO v_title FROM public.listings WHERE id = NEW.listing_id;
  v_amount := '$' || to_char(NEW.amount_cents / 100.0, 'FM999990.00');
  v_payout := '$' || to_char(NEW.helper_payout_cents / 100.0, 'FM999990.00');

  -- Funded: money authorized & held in escrow
  IF NEW.status = 'held' AND OLD.status IS DISTINCT FROM 'held' THEN
    -- Helper: funds are secured
    INSERT INTO public.notifications (user_id, title, body, type, link_to, read)
    VALUES (
      NEW.helper_id,
      'Payment secured in escrow',
      v_amount || ' is held for "' || v_title || '". You''ll be paid ' || v_payout ||
        ' when the task is marked complete.',
      'payment',
      '/chat/' || NEW.offer_id,
      false
    );
  END IF;

  -- Released: money captured and on its way to the helper's Stripe balance
  IF NEW.status = 'released' AND OLD.status IS DISTINCT FROM 'released' THEN
    -- Helper: payout sent
    INSERT INTO public.notifications (user_id, title, body, type, link_to, read)
    VALUES (
      NEW.helper_id,
      'You got paid! 🎉',
      v_payout || ' for "' || v_title || '" is on its way to your bank account.',
      'payment',
      '/chat/' || NEW.offer_id,
      false
    );
    -- Lister: confirmation
    INSERT INTO public.notifications (user_id, title, body, type, link_to, read)
    VALUES (
      NEW.requester_id,
      'Payment released',
      'You released ' || v_payout || ' to your helper for "' || v_title || '". Thanks for fostering!',
      'payment',
      '/chat/' || NEW.offer_id,
      false
    );
  END IF;

  -- Refunded: money returned to the lister
  IF NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM 'refunded' THEN
    INSERT INTO public.notifications (user_id, title, body, type, link_to, read)
    VALUES (
      NEW.requester_id,
      'Payment refunded',
      v_amount || ' for "' || v_title || '" has been refunded to you.',
      'payment',
      '/chat/' || NEW.offer_id,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_payment_change ON public.payment_requests;
CREATE TRIGGER trg_payment_change
  AFTER UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_payment_change();
