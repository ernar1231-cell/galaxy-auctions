-- Draft: atomic next-lot advance after SOLD. Not applied automatically.
-- No USA LIVE modifications. Requires service_role and explicit scheduler integration.
BEGIN;
CREATE OR REPLACE FUNCTION public.galaxy_advance_direction_lot(
 p_direction text,p_expected_lot bigint
) RETURNS TABLE(direction text,current_lot_number bigint,phase text,changed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.galaxy_auction_sessions%ROWTYPE;
DECLARE a public.galaxy_auction_lot_assignments%ROWTYPE;
DECLARE next_number bigint;
DECLARE next_price numeric;
BEGIN
 IF p_direction NOT IN ('dubai','transfer') OR p_expected_lot IS NULL THEN
  RAISE EXCEPTION 'Invalid direction or lot';
 END IF;
 SELECT * INTO s FROM public.galaxy_auction_sessions x WHERE x.direction=p_direction FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Session missing'; END IF;
 IF s.enabled IS DISTINCT FROM true OR s.phase IS DISTINCT FROM 'sold'
    OR s.current_lot_number IS DISTINCT FROM p_expected_lot
    OR s.phase_started_at IS NULL OR now()<s.phase_started_at+interval '2 seconds' THEN
  RETURN QUERY SELECT s.direction,s.current_lot_number,s.phase,false;RETURN;
 END IF;
 SELECT * INTO a FROM public.galaxy_auction_lot_assignments x
 WHERE x.direction=p_direction AND x.lot_number=p_expected_lot;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current lot assignment missing'; END IF;
 SELECT x.lot_number,l.starting_bid INTO next_number,next_price
 FROM public.galaxy_auction_lot_assignments x
 JOIN public.auction_lots l ON l.lot_number=x.lot_number
 WHERE x.direction=p_direction AND x.queue_position>a.queue_position
   AND l.status='upcoming'
   AND position('"direction":"'||p_direction||'"' in replace(coalesce(l.description,''),chr(92),''))>0
 ORDER BY x.queue_position,x.lot_number LIMIT 1;
 -- Persist completed result and prevent the same vehicle from re-entering the upcoming queue.
 UPDATE public.auction_lots l SET status='pending',updated_at=now() WHERE l.lot_number=p_expected_lot AND l.status='live';
 IF NOT FOUND THEN RAISE EXCEPTION 'Current lot must be live before completing sale'; END IF;
 IF next_number IS NULL THEN
  UPDATE public.galaxy_auction_sessions x SET enabled=false,phase='waiting',phase_started_at=NULL,updated_at=now() WHERE x.direction=p_direction;
  RETURN QUERY SELECT p_direction,p_expected_lot,'waiting'::text,true;RETURN;
 END IF;
 UPDATE public.galaxy_auction_sessions x
 SET current_lot_number=next_number,current_bid=coalesce(next_price,0),
 phase='red',phase_started_at=now(),updated_at=now()
 WHERE x.direction=p_direction;
 RETURN QUERY SELECT p_direction,next_number,'red'::text,true;
END;
$$;
REVOKE ALL ON FUNCTION public.galaxy_advance_direction_lot(text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.galaxy_advance_direction_lot(text,bigint) TO service_role;
COMMIT;
