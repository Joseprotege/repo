-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009: Task steps + in-offer messaging
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend listings with a pre-authored step guide
ALTER TABLE listings ADD COLUMN IF NOT EXISTS task_steps jsonb DEFAULT '[]';

-- 2. Extend offers with step-progress tracking and requested compensation
ALTER TABLE offers ADD COLUMN IF NOT EXISTS current_step_index int DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS steps_completed    boolean DEFAULT false;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS requested_amount_cents int DEFAULT 0;

-- 3. Task messages table
--    Stores: step responses, free-form DMs, system events, voice-call signals
CREATE TABLE IF NOT EXISTS task_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid        REFERENCES listings(id) ON DELETE CASCADE,
  offer_id    uuid        REFERENCES offers(id)   ON DELETE CASCADE,
  sender_id   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  type        text        NOT NULL CHECK (type IN (
    'step_response',
    'dm',
    'system',
    'voice_request',
    'voice_accept',
    'voice_decline'
  )),
  content     text        NOT NULL DEFAULT '',
  step_index  int,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_messages_offer
  ON task_messages (offer_id, created_at);

-- 4. Enable RLS
ALTER TABLE task_messages ENABLE ROW LEVEL SECURITY;

-- 5. SELECT: participants only (accepted helper OR lister)
CREATE POLICY IF NOT EXISTS "task_msg_select"
  ON task_messages FOR SELECT
  TO authenticated
  USING (
    -- is sender
    auth.uid() = sender_id
    -- is the accepted helper on this offer
    OR auth.uid() IN (
      SELECT user_id FROM offers
      WHERE id = task_messages.offer_id
        AND status IN ('accepted', 'completed')
    )
    -- is the lister who owns this listing
    OR auth.uid() IN (
      SELECT l.user_id
      FROM listings l
      JOIN offers o ON o.listing_id = l.id
      WHERE o.id = task_messages.offer_id
    )
  );

-- 6. INSERT: only participants can post (and must be the sender)
CREATE POLICY IF NOT EXISTS "task_msg_insert"
  ON task_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      auth.uid() IN (
        SELECT user_id FROM offers
        WHERE id = offer_id
          AND status IN ('accepted', 'completed')
      )
      OR auth.uid() IN (
        SELECT l.user_id
        FROM listings l
        JOIN offers o ON o.listing_id = l.id
        WHERE o.id = offer_id
      )
    )
  );

-- 7. Enable Realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE task_messages;
