-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 019: Tighten task_messages INSERT policy
--
-- The original lister INSERT check allowed a listing owner to post messages
-- into any offer on their listing regardless of the offer's status. A lister
-- should only be able to send messages in an active (accepted) chat.
-- This aligns the INSERT policy with the SELECT policy which already gates on
-- status IN ('accepted', 'completed') for the helper branch.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "task_msg_insert" ON public.task_messages;

CREATE POLICY "task_msg_insert"
  ON public.task_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      -- helper on an active offer
      auth.uid() IN (
        SELECT user_id FROM public.offers
        WHERE id = offer_id
          AND status IN ('accepted', 'completed')
      )
      -- listing owner, and the offer is active
      OR auth.uid() IN (
        SELECT l.user_id
        FROM public.listings l
        JOIN public.offers o ON o.listing_id = l.id
        WHERE o.id = offer_id
          AND o.status IN ('accepted', 'completed')
      )
    )
  );
