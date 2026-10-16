-- Single-line auction cycle state in the EXISTING Supabase database.
-- Apply only after the USA/Dubai/Transit scheduler integration is reviewed.
-- No UI, bid, Buyout, auction_lots, or auction_state changes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.galaxy_single_line_cycle (
 id smallint PRIMARY KEY DEFAULT 1 CHECK (id=1),
 phase text NOT NULL DEFAULT 'stopped'
   CHECK (phase IN ('stopped','live','break')),
 direction text CHECK (direction IN ('usa','dubai','transfer')),
 next_direction text CHECK (next_direction IN ('dubai','transfer')),
 break_started_at timestamptz,
 break_ends_at timestamptz,
 completed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT galaxy_cycle_consistent_state CHECK (
   (phase='stopped' AND direction IS NULL AND next_direction IS NULL AND break_started_at IS NULL AND break_ends_at IS NULL)
   OR (phase='live' AND direction IS NOT NULL AND next_direction IS NULL AND break_started_at IS NULL AND break_ends_at IS NULL)
   OR (phase='break' AND direction IS NULL AND next_direction IS NOT NULL
       AND break_started_at IS NOT NULL AND break_ends_at=break_started_at+interval '1 hour')
 )
);
INSERT INTO public.galaxy_single_line_cycle(id,phase)
VALUES(1,'stopped') ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.galaxy_single_line_cycle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.galaxy_single_line_cycle FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.galaxy_single_line_cycle TO service_role;
COMMIT;
