-- Demo-only permission update. Telegram HMAC validation is required by the API.
BEGIN;
CREATE OR REPLACE FUNCTION public.galaxy_demo_bid(
 p_user_telegram_id text,p_mode text,p_amount numeric
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE st public.galaxy_demo_lot_state%ROWTYPE;
DECLARE current_leader text; winner text; top_max numeric; second_max numeric;
DECLARE candidate numeric; final_price numeric; old_max numeric;
BEGIN
 IF p_user_telegram_id IS NULL OR p_user_telegram_id='' OR p_mode NOT IN('manual','proxy')
 OR p_amount IS NULL OR p_amount<=0 OR (p_mode='manual' AND p_amount NOT IN(100,1000,10000))
 THEN RAISE EXCEPTION 'Invalid demo bid'; END IF;
 -- Demo is conditional only: authenticated Telegram users may test regardless of account status.
 SELECT * INTO st FROM public.galaxy_demo_lot_state WHERE direction='dubai' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Demo unavailable'; END IF;
 SELECT e.user_telegram_id INTO current_leader FROM public.galaxy_demo_bid_events e
 WHERE e.direction='dubai' AND e.lot_number=69 ORDER BY e.id DESC LIMIT 1;
 candidate:=CASE WHEN p_mode='manual' THEN st.current_bid+p_amount ELSE p_amount END;
 IF candidate<=st.current_bid THEN RAISE EXCEPTION 'Bid must exceed current price'; END IF;
 IF p_mode='manual' AND current_leader=p_user_telegram_id THEN
  UPDATE public.galaxy_demo_lot_state SET current_bid=candidate,updated_at=clock_timestamp() WHERE direction='dubai';
  INSERT INTO public.galaxy_demo_bid_events(direction,lot_number,user_telegram_id,amount) VALUES('dubai',69,p_user_telegram_id,candidate);
  RETURN candidate;
 END IF;
 IF p_mode='proxy' THEN
  SELECT maximum INTO old_max FROM public.galaxy_demo_proxy_maxima
  WHERE direction='dubai' AND lot_number=69 AND user_telegram_id=p_user_telegram_id;
  IF old_max IS NOT NULL AND candidate<old_max THEN RAISE EXCEPTION 'Cannot lower proxy'; END IF;
  INSERT INTO public.galaxy_demo_proxy_maxima(direction,lot_number,user_telegram_id,maximum)
  VALUES('dubai',69,p_user_telegram_id,candidate)
  ON CONFLICT(direction,lot_number,user_telegram_id)
  DO UPDATE SET maximum=excluded.maximum;
 END IF;
 SELECT c.uid,c.mx INTO winner,top_max FROM (
  SELECT user_telegram_id uid,maximum mx,created_at ts FROM public.galaxy_demo_proxy_maxima
  WHERE direction='dubai' AND lot_number=69
  UNION ALL SELECT p_user_telegram_id,candidate,clock_timestamp() WHERE p_mode='manual'
  UNION ALL SELECT current_leader,st.current_bid,clock_timestamp()-interval '1 day'
  WHERE current_leader IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.galaxy_demo_proxy_maxima WHERE user_telegram_id=current_leader)
  AND (p_mode<>'manual' OR current_leader<>p_user_telegram_id)
 ) c ORDER BY mx DESC,ts ASC,uid ASC LIMIT 1;
 IF winner IS NULL THEN RAISE EXCEPTION 'No winner'; END IF;
 IF p_mode='proxy' AND winner=current_leader AND winner=p_user_telegram_id THEN RETURN st.current_bid; END IF;
 SELECT max(mx) INTO second_max FROM (
  SELECT user_telegram_id uid,maximum mx FROM public.galaxy_demo_proxy_maxima WHERE direction='dubai' AND lot_number=69
  UNION ALL SELECT p_user_telegram_id,candidate WHERE p_mode='manual'
  UNION ALL SELECT current_leader,st.current_bid WHERE current_leader IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM public.galaxy_demo_proxy_maxima WHERE user_telegram_id=current_leader)
  AND (p_mode<>'manual' OR current_leader<>p_user_telegram_id)
 ) c WHERE uid<>winner;
 final_price:=least(top_max,greatest(st.current_bid+100,coalesce(second_max+100,st.current_bid+100)));
 IF p_mode='manual' AND winner=p_user_telegram_id THEN final_price:=greatest(final_price,candidate); END IF;
 IF final_price<=st.current_bid OR final_price>top_max THEN RAISE EXCEPTION 'Invalid demo price'; END IF;
 UPDATE public.galaxy_demo_lot_state SET current_bid=final_price,updated_at=clock_timestamp() WHERE direction='dubai';
 INSERT INTO public.galaxy_demo_bid_events(direction,lot_number,user_telegram_id,amount)
 VALUES('dubai',69,winner,final_price);
 RETURN final_price;
END $$;
REVOKE ALL ON FUNCTION public.galaxy_demo_bid(text,text,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.galaxy_demo_bid(text,text,numeric) TO service_role;
COMMIT;
