-- Atomically activate the next direction and its first lot after the persisted break.
-- Replaces the earlier mark-only draft; do not call that draft RPC.
-- No changes to bid tables or UI. Run only after cycle state migration.
BEGIN;
CREATE OR REPLACE FUNCTION public.galaxy_cycle_start_next()
RETURNS TABLE(started boolean, direction text, lot_number bigint, phase text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.galaxy_single_line_cycle%ROWTYPE;
DECLARE s public.galaxy_auction_sessions%ROWTYPE;
DECLARE next_lot bigint;
DECLARE initial_bid numeric;
BEGIN
 SELECT * INTO c FROM public.galaxy_single_line_cycle WHERE id=1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cycle state missing'; END IF;
 IF c.phase <> 'break' OR c.next_direction NOT IN ('dubai','transfer')
    OR c.break_ends_at IS NULL OR now() < c.break_ends_at THEN
  RETURN QUERY SELECT false,c.next_direction,NULL::bigint,c.phase;RETURN;
 END IF;
 SELECT * INTO s FROM public.galaxy_auction_sessions x
 WHERE x.direction=c.next_direction FOR UPDATE;
 IF NOT FOUND OR s.enabled OR s.phase <> 'waiting' THEN
  RAISE EXCEPTION 'Next direction session not ready';
 END IF;
 IF EXISTS (SELECT 1 FROM public.galaxy_auction_sessions x WHERE x.enabled=true)
    OR EXISTS (SELECT 1 FROM public.auction_state x WHERE x.id=1 AND x.status='live')
    OR EXISTS (SELECT 1 FROM public.auction_lots l WHERE l.status='live') THEN
  RAISE EXCEPTION 'Another auction or lot is live';
 END IF;
 SELECT l.lot_number,l.starting_bid INTO next_lot,initial_bid
 FROM public.galaxy_auction_lot_assignments a
 JOIN public.auction_lots l ON l.lot_number=a.lot_number
 WHERE a.direction=c.next_direction AND l.status='upcoming'
   AND position('"direction":"'||c.next_direction||'"' in replace(coalesce(l.description,''),chr(92),''))>0
 ORDER BY a.queue_position,a.lot_number LIMIT 1 FOR UPDATE OF l;
 IF next_lot IS NULL THEN
  -- No empty auction starts; a later explicit operator decision is required.
  RETURN QUERY SELECT false,c.next_direction,NULL::bigint,'break'::text;RETURN;
 END IF;
 UPDATE public.auction_lots l SET status='live',updated_at=now()
 WHERE l.lot_number=next_lot AND l.status='upcoming';
 IF NOT FOUND THEN RAISE EXCEPTION 'Lot activation race'; END IF;
 UPDATE public.galaxy_auction_sessions x
 SET enabled=true,start_armed=false,phase='red',current_lot_number=next_lot,
 current_bid=coalesce(initial_bid,0),phase_started_at=now(),updated_at=now()
 WHERE x.direction=c.next_direction;
 UPDATE public.galaxy_single_line_cycle x
 SET phase='live',direction=c.next_direction,next_direction=NULL,
 break_started_at=NULL,break_ends_at=NULL,updated_at=now() WHERE x.id=1;
 RETURN QUERY SELECT true,c.next_direction,next_lot,'live'::text;
END;
$$;
REVOKE ALL ON FUNCTION public.galaxy_cycle_start_next() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.galaxy_cycle_start_next() TO service_role;
COMMIT;
