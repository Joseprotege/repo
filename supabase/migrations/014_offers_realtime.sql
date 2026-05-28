-- Enable Realtime for offers so listers see incoming offers live and helpers
-- see status changes (accepted/declined) without a refresh.
-- REPLICA IDENTITY FULL ensures UPDATE/DELETE events carry the full old row.
ALTER TABLE public.offers REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'offers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
  END IF;
END $$;
