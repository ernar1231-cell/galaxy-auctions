-- Independent direction lot selection. No USA LIVE modifications.
-- Must be invoked only by trusted server using service_role.
BEGIN;
CREATE OR REPLACE FUNCTION public.galaxy_select_direction_lot(
 p_direction text,p_lot_number bigint
) RETURNS TABLE(direction text,current_lot_number bigint,current_bid numeric,phase text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.galaxy_auction_sessions%ROWTYPE;
DECLARE l public.auction_lots%ROWTYPE;
BEGIN
 IF p_direction NOT IN ('dubai','transfer') OR p_lot_number IS NULL OR p_lot_number<=0 THEN
  RAISE EXCEPTION 'Invalid direction or lot';
 END IF;
 SELECT * INTO s FROM public.galaxy_auction_sessions WHERE galaxy_auction_sessions.direction=p_direction FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Direction session not found'; END IF;
 IF s.enabled OR s.phase NOT IN ('waiting','sold') THEN RAISE EXCEPTION 'Cannot switch an active auction'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.galaxy_auction_lot_assignments a WHERE a.lot_number=p_lot_number AND a.direction=p_direction) THEN
  RAISE EXCEPTION 'Lot not assigned to direction';
 END IF;
 SELECT * INTO l FROM public.auction_lots WHERE lot_number=p_lot_number;
 IF NOT FOUND OR l.status NOT IN ('upcoming','live') OR position('"direction":"'||p_direction||'"' in replace(coalesce(l.description,''),chr(92),''))=0 THEN
  RAISE EXCEPTION 'Lot direction or status mismatch';
 END IF;
 UPDATE public.galaxy_auction_sessions s2
 SET current_lot_number=p_lot_number,current_bid=coalesce(l.starting_bid,0),phase='waiting',phase_started_at=null,updated_at=now()
 WHERE s2.direction=p_direction;
 RETURN QUERY SELECT p_direction,p_lot_number,coalesce(l.starting_bid,0)::numeric,'waiting'::text;
END;
$$;
REVOKE ALL ON FUNCTION public.galaxy_select_direction_lot(text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.galaxy_select_direction_lot(text,bigint) TO service_role;
COMMIT;
