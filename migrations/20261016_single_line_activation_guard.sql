-- Atomic cycle phase activation. Does NOT activate a bid session or a lot.
-- The trusted worker must start the corresponding existing auction engine separately.
BEGIN;
CREATE OR REPLACE FUNCTION public.galaxy_cycle_mark_direction_live(
 p_direction text
) RETURNS TABLE(phase text,direction text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.galaxy_single_line_cycle%ROWTYPE;
BEGIN
 IF p_direction NOT IN ('dubai','transfer') THEN RAISE EXCEPTION 'Invalid direction'; END IF;
 SELECT * INTO s FROM public.galaxy_single_line_cycle WHERE id=1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cycle missing'; END IF;
 IF s.phase <> 'break' OR s.next_direction IS DISTINCT FROM p_direction
    OR s.break_ends_at IS NULL OR now() < s.break_ends_at THEN
  RETURN QUERY SELECT s.phase,s.direction;RETURN;
 END IF;
 IF EXISTS (
  SELECT 1 FROM public.galaxy_auction_sessions x
  WHERE x.enabled=true AND x.direction<>p_direction
 ) OR EXISTS (
  SELECT 1 FROM public.auction_state x WHERE x.id=1 AND x.status='live'
 ) THEN RAISE EXCEPTION 'Another auction is still live'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.galaxy_auction_lot_assignments a
  JOIN public.auction_lots l ON l.lot_number=a.lot_number
  WHERE a.direction=p_direction AND l.status='upcoming'
 ) THEN RAISE EXCEPTION 'No eligible lots for direction'; END IF;
 UPDATE public.galaxy_single_line_cycle c
 SET phase='live',direction=p_direction,next_direction=NULL,
     break_started_at=NULL,break_ends_at=NULL,updated_at=now()
 WHERE c.id=1;
 RETURN QUERY SELECT c.phase,c.direction FROM public.galaxy_single_line_cycle c WHERE c.id=1;
END;
$$;
REVOKE ALL ON FUNCTION public.galaxy_cycle_mark_direction_live(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.galaxy_cycle_mark_direction_live(text) TO service_role;
COMMIT;
