-- Draft only. Apply to staging after schema review, never automatically.
-- Atomic Dubai/Transit bidding. The server must verify Telegram initData first.
BEGIN;
CREATE OR REPLACE FUNCTION public.galaxy_place_direction_bid(
 p_direction text,p_lot_number bigint,p_user_telegram_id text,p_increment numeric
) RETURNS TABLE(event_id bigint,new_bid numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 s public.galaxy_auction_sessions%ROWTYPE;
 a public.galaxy_auction_lot_assignments%ROWTYPE;
 u public.auction_users%ROWTYPE;
 v_next numeric(18,2);
 v_id bigint;
BEGIN
 IF p_direction NOT IN ('dubai','transfer') OR p_lot_number IS NULL
    OR nullif(p_user_telegram_id,'') IS NULL OR p_increment IS NULL
    OR p_increment NOT IN (100,1000,10000) THEN
  RAISE EXCEPTION 'Invalid bid parameters';
 END IF;
 SELECT * INTO s FROM public.galaxy_auction_sessions x
 WHERE x.direction=p_direction FOR UPDATE;
 IF NOT FOUND OR s.enabled IS DISTINCT FROM true
    OR s.phase NOT IN ('red','green','bonus')
    OR s.current_lot_number IS DISTINCT FROM p_lot_number
    OR s.phase_started_at IS NULL
    OR now()>=s.phase_started_at+interval '15 seconds' THEN
  RAISE EXCEPTION 'Auction not accepting bids';
 END IF;
 SELECT * INTO a FROM public.galaxy_auction_lot_assignments x
 WHERE x.lot_number=p_lot_number;
 IF NOT FOUND OR a.direction<>p_direction THEN
  RAISE EXCEPTION 'Lot not assigned to this auction';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.auction_lots l
  WHERE l.lot_number=p_lot_number AND l.status='live'
   AND position('"direction":"'||p_direction||'"'
       in replace(coalesce(l.description,''),chr(92),''))>0
 ) THEN RAISE EXCEPTION 'Lot not live in direction'; END IF;
 SELECT * INTO u FROM public.auction_users x
 WHERE x.telegram_id::text=p_user_telegram_id;
 IF NOT FOUND OR lower(coalesce(u.account_status,''))<>'active' THEN
  RAISE EXCEPTION 'Account not active';
 END IF;
 v_next:=s.current_bid+p_increment;
 IF v_next IS NULL OR coalesce(u.deposit_amount,0)<=0
    OR u.bid_limit IS NULL OR u.bid_limit::numeric<v_next THEN
  RAISE EXCEPTION 'Bid limit exceeded';
 END IF;
 UPDATE public.galaxy_auction_sessions x
 SET current_bid=v_next,phase='red',phase_started_at=now(),updated_at=now()
 WHERE x.direction=p_direction;
 INSERT INTO public.galaxy_auction_bid_events(direction,lot_number,user_telegram_id,amount)
 VALUES(p_direction,p_lot_number,p_user_telegram_id,v_next) RETURNING id INTO v_id;
 RETURN QUERY SELECT v_id,v_next;
END;
$$;
REVOKE ALL ON FUNCTION public.galaxy_place_direction_bid(text,bigint,text,numeric)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.galaxy_place_direction_bid(text,bigint,text,numeric)
 TO service_role;
COMMIT;
