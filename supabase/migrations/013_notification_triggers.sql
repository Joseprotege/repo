-- Notify lister when a new offer arrives on their listing
CREATE OR REPLACE FUNCTION public.notify_on_offer_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_requester_id uuid;
  v_title        text;
BEGIN
  SELECT user_id, title INTO v_requester_id, v_title
  FROM public.listings WHERE id = NEW.listing_id;

  IF v_requester_id IS NOT NULL AND v_requester_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, body, type, link_to, read)
    VALUES (
      v_requester_id,
      'New offer on your task',
      'Someone made an offer on "' || v_title || '"',
      'offer',
      '/listing/' || NEW.listing_id,
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_offer_insert
  AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_offer_insert();

-- Notify helper when their offer is accepted
CREATE OR REPLACE FUNCTION public.notify_on_offer_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    SELECT title INTO v_title FROM public.listings WHERE id = NEW.listing_id;

    INSERT INTO public.notifications (user_id, title, body, type, link_to, read)
    VALUES (
      NEW.user_id,
      'Your offer was accepted!',
      'Your offer on "' || v_title || '" was accepted. Head to chat to coordinate.',
      'offer_accepted',
      '/chat/' || NEW.id,
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_offer_accepted
  AFTER UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_offer_accepted();
