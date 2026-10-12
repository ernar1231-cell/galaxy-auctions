-- Apply only after review. No automatic auction activation.
BEGIN;
CREATE OR REPLACE FUNCTION public.galaxy_advance_direction_phase(
 p_direction text,p_expected_lot bigint,p_expected_phase text
) RETURNS TABLE(direction text,phase text,current_lot_number bigint,changed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.galaxy_auction_sessions%ROWTYPE;
DECLARE v_duration integer;
DECLARE v_next text;
BEGIN
 IF p_direction NOT IN ('dubai','transfer') OR p_expected_lot IS NULL THEN
  RAISE EXCEPTION 'Invalid direction or lot';
 END IF;
 SELECT * INTO s FROM public.galaxy_auction_sessions x WHERE x.direction=p_direction FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Direction not configured'; END IF;
 IF s.enabled IS DISTINCT FROM true OR s.current_lot_number IS DISTINCT FROM p_expected_lot OR s.phase IS DISTINCT FROM p_expected_phase THEN
  RETURN QUERY SELECT s.direction,s.phase,s.current_lot_number,false;RETURN;
 END IF;
 v_duration:=CASE s.phase WHEN 'red' THEN 15 WHEN 'green' THEN 15 WHEN 'bonus' THEN 15 WHEN 'sold' THEN 2 ELSE NULL END;
 v_next:=CASE s.phase WHEN 'red' THEN 'bonus' WHEN 'green' THEN 'bonus' WHEN 'bonus' THEN 'sold' WHEN 'sold' THEN 'waiting' ELSE NULL END;
 IF v_duration IS NULL OR s.phase_started_at IS NULL OR now()<s.phase_started_at+make_interval(secs=>v_duration) THEN
  RETURN QUERY SELECT s.direction,s.phase,s.current_lot_number,false;RETURN;
 END IF;
 UPDATE public.galaxy_auction_sessions x
 SET phase=v_next,phase_started_at=CASE WHEN v_next='waiting' THEN NULL ELSE now() END,updated_at=now()
 WHERE x.direction=p_direction;
 RETURN QUERY SELECT p_direction,v_next,p_expected_lot,true;
END;
$$;
REVOKE ALL ON FUNCTION public.galaxy_advance_direction_phase(text,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.galaxy_advance_direction_phase(text,bigint,text) TO service_role;
COMMIT;
