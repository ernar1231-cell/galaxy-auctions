-- Explicitly armed direction sessions start only at Dubai 18:00, never USA.
-- Does not arm any session; a separate admin action must do that.
BEGIN;
ALTER TABLE public.galaxy_auction_sessions
 ADD COLUMN IF NOT EXISTS start_armed boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS last_started_local_date date;
CREATE OR REPLACE FUNCTION public.galaxy_start_armed_direction(
 p_direction text
) RETURNS TABLE(direction text,started boolean,current_lot_number bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.galaxy_auction_sessions%ROWTYPE;
DECLARE local_now timestamp;
DECLARE today date;
BEGIN
 IF p_direction NOT IN ('dubai','transfer') THEN RAISE EXCEPTION 'Invalid direction'; END IF;
 SELECT * INTO s FROM public.galaxy_auction_sessions x WHERE x.direction=p_direction FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
 local_now=now() AT TIME ZONE 'Asia/Dubai';
 today=local_now::date;
 IF s.enabled OR s.start_armed IS DISTINCT FROM true OR s.current_lot_number IS NULL
    OR s.phase<>'waiting' OR s.last_started_local_date=today
    OR local_now::time < s.local_start THEN
  RETURN QUERY SELECT p_direction,false,s.current_lot_number;RETURN;
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.galaxy_auction_lot_assignments a
  JOIN public.auction_lots l ON l.lot_number=a.lot_number
  WHERE a.direction=p_direction AND a.lot_number=s.current_lot_number AND l.status='live'
 ) THEN
  RETURN QUERY SELECT p_direction,false,s.current_lot_number;RETURN;
 END IF;
 UPDATE public.galaxy_auction_sessions x SET enabled=true,start_armed=false,phase='red',
 phase_started_at=now(),last_started_local_date=today,updated_at=now()
 WHERE x.direction=p_direction;
 RETURN QUERY SELECT p_direction,true,s.current_lot_number;
END;
$$;
REVOKE ALL ON FUNCTION public.galaxy_start_armed_direction(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.galaxy_start_armed_direction(text) TO service_role;
COMMIT;
