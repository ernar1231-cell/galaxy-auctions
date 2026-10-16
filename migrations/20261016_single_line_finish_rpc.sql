-- Atomic transition guards for the single existing auction cycle.
-- This migration does not start or close any auction and does not alter bids.
BEGIN;
CREATE OR REPLACE FUNCTION public.galaxy_cycle_finish_direction(
 p_direction text, p_finished_at timestamptz DEFAULT now()
) RETURNS TABLE(phase text,next_direction text,break_ends_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.galaxy_single_line_cycle%ROWTYPE;
DECLARE following text;
BEGIN
 IF p_direction NOT IN ('usa','dubai','transfer') OR p_finished_at IS NULL
   OR p_finished_at > now() + interval '5 seconds' THEN
  RAISE EXCEPTION 'Invalid direction or finish time';
 END IF;
 SELECT * INTO s FROM public.galaxy_single_line_cycle WHERE id=1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cycle not configured'; END IF;
 IF s.phase <> 'live' OR s.direction IS DISTINCT FROM p_direction THEN
  RETURN QUERY SELECT s.phase,s.next_direction,s.break_ends_at; RETURN;
 END IF;
 -- A trusted scheduler must first establish that the final lot is settled.
 -- This RPC refuses to close a direction while an auction lot is LIVE.
 IF EXISTS (
   SELECT 1 FROM public.auction_lots l
   WHERE l.status='live' AND (
     (p_direction='usa' AND NOT EXISTS (
       SELECT 1 FROM public.galaxy_auction_lot_assignments a
       WHERE a.lot_number=l.lot_number AND a.direction IN ('dubai','transfer')
     ))
     OR EXISTS (
       SELECT 1 FROM public.galaxy_auction_lot_assignments a
       WHERE a.lot_number=l.lot_number AND a.direction=p_direction
     )
   )
 ) THEN RAISE EXCEPTION 'Direction still has a live lot'; END IF;
 -- Do not end the direction while unfinished eligible lots remain.
 IF EXISTS (
   SELECT 1 FROM public.auction_lots l
   WHERE l.status='upcoming' AND (
     (p_direction='usa' AND NOT EXISTS (
       SELECT 1 FROM public.galaxy_auction_lot_assignments a
       WHERE a.lot_number=l.lot_number AND a.direction IN ('dubai','transfer')
     ))
     OR EXISTS (
       SELECT 1 FROM public.galaxy_auction_lot_assignments a
       WHERE a.lot_number=l.lot_number AND a.direction=p_direction
     )
   )
 ) THEN RAISE EXCEPTION 'Direction still has upcoming lots'; END IF;
 following=CASE p_direction WHEN 'usa' THEN 'dubai'
   WHEN 'dubai' THEN 'transfer' ELSE NULL END;
 IF following IS NULL THEN
  UPDATE public.galaxy_single_line_cycle
  SET phase='stopped',direction=NULL,next_direction=NULL,
      break_started_at=NULL,break_ends_at=NULL,completed_at=p_finished_at,updated_at=now()
  WHERE id=1;
 ELSE
  UPDATE public.galaxy_single_line_cycle
  SET phase='break',direction=NULL,next_direction=following,
      break_started_at=p_finished_at,break_ends_at=p_finished_at+interval '1 hour',
      updated_at=now()
  WHERE id=1;
 END IF;
 RETURN QUERY SELECT c.phase,c.next_direction,c.break_ends_at
 FROM public.galaxy_single_line_cycle c WHERE c.id=1;
END;
$$;
REVOKE ALL ON FUNCTION public.galaxy_cycle_finish_direction(text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.galaxy_cycle_finish_direction(text,timestamptz) TO service_role;
COMMIT;
