-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 020: Content length limits (server-side, bypass-proof)
--
-- All current input validation is client-side (HTML maxLength) and is trivially
-- bypassed by hitting the Supabase REST API directly with the anon key. These
-- CHECK constraints enforce sane caps at the database layer so a malicious or
-- buggy client cannot store megabyte-sized payloads, break the UI, or run up
-- storage/egress costs.
--
-- Limits are intentionally GENEROUS (looser than the UI caps in
-- lend/src/lib/limits.ts) so legitimate input never trips them; they exist to
-- stop abuse, not to second-guess the UI.
--
-- All constraints use NOT VALID: they are enforced on every INSERT/UPDATE going
-- forward but skip re-validating pre-existing rows, so the migration can never
-- fail on legacy/test data.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: longest element in a text[] (0 for null/empty). Used for array caps.
CREATE OR REPLACE FUNCTION public.max_array_text_len(arr text[])
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(max(char_length(x)), 0) FROM unnest(arr) AS x;
$$;

-- ── LISTINGS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_title_len;
ALTER TABLE public.listings ADD  CONSTRAINT listings_title_len
  CHECK (char_length(title) <= 120) NOT VALID;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_desc_len;
ALTER TABLE public.listings ADD  CONSTRAINT listings_desc_len
  CHECK (char_length(description) <= 4000) NOT VALID;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_city_len;
ALTER TABLE public.listings ADD  CONSTRAINT listings_city_len
  CHECK (char_length(city) <= 120) NOT VALID;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_state_len;
ALTER TABLE public.listings ADD  CONSTRAINT listings_state_len
  CHECK (char_length(state) <= 120) NOT VALID;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_neighborhood_len;
ALTER TABLE public.listings ADD  CONSTRAINT listings_neighborhood_len
  CHECK (char_length(neighborhood) <= 120) NOT VALID;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_category_len;
ALTER TABLE public.listings ADD  CONSTRAINT listings_category_len
  CHECK (char_length(category) <= 60) NOT VALID;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_urgency_len;
ALTER TABLE public.listings ADD  CONSTRAINT listings_urgency_len
  CHECK (char_length(urgency) <= 30) NOT VALID;

-- Tags: at most 12 tags, each at most 40 chars.
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_tags_count;
ALTER TABLE public.listings ADD  CONSTRAINT listings_tags_count
  CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 12) NOT VALID;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_tags_len;
ALTER TABLE public.listings ADD  CONSTRAINT listings_tags_len
  CHECK (public.max_array_text_len(tags) <= 40) NOT VALID;

-- Task steps (jsonb): at most 30 steps and 20 KB total serialized size.
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_steps_count;
ALTER TABLE public.listings ADD  CONSTRAINT listings_steps_count
  CHECK (
    task_steps IS NULL
    OR jsonb_typeof(task_steps) <> 'array'
    OR jsonb_array_length(task_steps) <= 30
  ) NOT VALID;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_steps_size;
ALTER TABLE public.listings ADD  CONSTRAINT listings_steps_size
  CHECK (task_steps IS NULL OR octet_length(task_steps::text) <= 20000) NOT VALID;

-- ── OFFERS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_message_len;
ALTER TABLE public.offers ADD  CONSTRAINT offers_message_len
  CHECK (char_length(message) <= 2000) NOT VALID;

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_rating_note_req_len;
ALTER TABLE public.offers ADD  CONSTRAINT offers_rating_note_req_len
  CHECK (char_length(rating_note_by_requester) <= 1000) NOT VALID;

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_rating_note_helper_len;
ALTER TABLE public.offers ADD  CONSTRAINT offers_rating_note_helper_len
  CHECK (char_length(rating_note_by_helper) <= 1000) NOT VALID;

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_completion_type_len;
ALTER TABLE public.offers ADD  CONSTRAINT offers_completion_type_len
  CHECK (char_length(completion_type) <= 40) NOT VALID;

-- ── TASK MESSAGES ─────────────────────────────────────────────────────────────
ALTER TABLE public.task_messages DROP CONSTRAINT IF EXISTS task_messages_content_len;
ALTER TABLE public.task_messages ADD  CONSTRAINT task_messages_content_len
  CHECK (char_length(content) <= 4000) NOT VALID;

-- ── COMMUNITY BROADCASTS ──────────────────────────────────────────────────────
ALTER TABLE public.community_broadcasts DROP CONSTRAINT IF EXISTS broadcasts_message_len;
ALTER TABLE public.community_broadcasts ADD  CONSTRAINT broadcasts_message_len
  CHECK (char_length(message) <= 1000) NOT VALID;

ALTER TABLE public.community_broadcasts DROP CONSTRAINT IF EXISTS broadcasts_note_len;
ALTER TABLE public.community_broadcasts ADD  CONSTRAINT broadcasts_note_len
  CHECK (char_length(note) <= 400) NOT VALID;

ALTER TABLE public.community_broadcasts DROP CONSTRAINT IF EXISTS broadcasts_area_len;
ALTER TABLE public.community_broadcasts ADD  CONSTRAINT broadcasts_area_len
  CHECK (char_length(area_label) <= 120) NOT VALID;

ALTER TABLE public.community_broadcasts DROP CONSTRAINT IF EXISTS broadcasts_category_len;
ALTER TABLE public.community_broadcasts ADD  CONSTRAINT broadcasts_category_len
  CHECK (char_length(category) <= 60) NOT VALID;

-- ── REPORTS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_details_len;
ALTER TABLE public.reports ADD  CONSTRAINT reports_details_len
  CHECK (char_length(details) <= 2000) NOT VALID;

-- ── PROFILES ──────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_username_len
  CHECK (char_length(username) <= 40) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_display_name_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_display_name_len
  CHECK (char_length(display_name) <= 80) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_bio_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_bio_len
  CHECK (char_length(bio) <= 600) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_city_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_city_len
  CHECK (char_length(city) <= 120) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_state_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_state_len
  CHECK (char_length(state) <= 120) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_neighborhood_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_neighborhood_len
  CHECK (char_length(neighborhood) <= 120) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_skills_count;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_skills_count
  CHECK (array_length(skills, 1) IS NULL OR array_length(skills, 1) <= 20) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_skills_len;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_skills_len
  CHECK (public.max_array_text_len(skills) <= 50) NOT VALID;
