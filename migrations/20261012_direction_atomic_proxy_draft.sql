-- Draft, not deployed. Atomic shared entry point for manual and proxy bids.
-- USA LIVE is deliberately excluded. Requires staging validation before production.
BEGIN;
CREATE TABLE IF NOT EXISTS public.galaxy_direction_proxy_maxima(
 direction text NOT NULL REFERENCES public.galaxy_auction_sessions(direction),
 lot_number bigint NOT NULL REFERENCES public.galaxy_auction_lot_assignments(lot_number),
 user_telegram_id text NOT NULL REFERENCES public.auction_users(telegram_id),
 max_amount numeric(18,2) NOT NULL CHECK(max_amount>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(direction,lot_number,user_telegram_id),
 CONSTRAINT direction_proxy_allowed CHECK(direction IN ('dubai','transfer'))
);
ALTER TABLE public.galaxy_direction_proxy_maxima ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.galaxy_direction_proxy_maxima FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.galaxy_direction_proxy_maxima TO service_role;

CREATE OR REPLACE FUNCTION public.galaxy_direction_submit_bid(
 p_direction text,p_lot_number bigint,p_user_telegram_id text,
 p_mode text,p_amount numeric
) RETURNS TABLE(event_id bigint,new_bid numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.galaxy_auction_sessions%ROWTYPE;
DECLARE u public.auction_users%ROWTYPE;
DECLARE old_max numeric;
DECLARE current_leader text;
DECLARE winner_id text;
DECLARE winning_max numeric;
DECLARE runner_max numeric;
DECLARE candidate numeric;
DECLARE final_price numeric;
DECLARE new_event bigint;
BEGIN
 IF p_direction NOT IN ('dubai','transfer') OR p_lot_number IS NULL
 OR nullif(p_user_telegram_id,'') IS NULL OR p_mode NOT IN ('manual','proxy')
 OR p_amount IS NULL OR p_amount<=0 THEN RAISE EXCEPTION 'Invalid bid'; END IF;
 IF p_mode='manual' AND p_amount NOT IN (100,1000,10000) THEN
  RAISE EXCEPTION 'Invalid increment'; END IF;
 -- This row lock serializes all bids and proxy updates for this direction.
 SELECT * INTO s FROM public.galaxy_auction_sessions x WHERE x.direction=p_direction FOR UPDATE;
 IF NOT FOUND OR s.enabled IS DISTINCT FROM true OR s.current_lot_number IS DISTINCT FROM p_lot_number
 OR s.phase NOT IN ('red','green','bonus') OR s.phase_started_at IS NULL
 OR now()>=s.phase_started_at+interval '15 seconds' THEN
  RAISE EXCEPTION 'Auction not accepting bids'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.galaxy_auction_lot_assignments a
 WHERE a.direction=p_direction AND a.lot_number=p_lot_number)
 OR NOT EXISTS(SELECT 1 FROM public.auction_lots l WHERE l.lot_number=p_lot_number
 AND l.status='live'
 AND position('"direction":"'||p_direction||'"' in replace(coalesce(l.description,''),chr(92),''))>0)
 THEN RAISE EXCEPTION 'Wrong lot'; END IF;
 SELECT * INTO u FROM public.auction_users x WHERE x.telegram_id=p_user_telegram_id;
 IF NOT FOUND OR lower(coalesce(u.account_status,''))<>'active' OR coalesce(u.deposit_amount,0)<=0
 THEN RAISE EXCEPTION 'Account not eligible'; END IF;
 candidate:=CASE WHEN p_mode='manual' THEN s.current_bid+p_amount ELSE p_amount END;
 IF candidate<=s.current_bid OR candidate>u.bid_limit THEN
  RAISE EXCEPTION 'Maximum below price or limit exceeded'; END IF;
 IF p_mode='proxy' THEN
  SELECT x.max_amount INTO old_max FROM public.galaxy_direction_proxy_maxima x
  WHERE x.direction=p_direction AND x.lot_number=p_lot_number
  AND x.user_telegram_id=p_user_telegram_id FOR UPDATE;
  IF old_max IS NOT NULL AND candidate<old_max THEN RAISE EXCEPTION 'Cannot reduce proxy'; END IF;
  INSERT INTO public.galaxy_direction_proxy_maxima(direction,lot_number,user_telegram_id,max_amount)
  VALUES(p_direction,p_lot_number,p_user_telegram_id,candidate)
  ON CONFLICT(direction,lot_number,user_telegram_id)
  DO UPDATE SET max_amount=excluded.max_amount,updated_at=now();
 END IF;
 -- Existing winning event represents the current leader; only accepted winning
 -- prices are recorded. Never expose hidden proxy maxima to public history.
 SELECT b.user_telegram_id INTO current_leader
 FROM public.galaxy_auction_bid_events b
 WHERE b.direction=p_direction AND b.lot_number=p_lot_number
 ORDER BY b.id DESC LIMIT 1;
 -- A manual bid is a competing offer at exactly candidate, not a proxy maximum.
 -- Proxy entries are ordered by maximum, then first creation, then ID.
 SELECT contenders.user_id,contenders.max_value INTO winner_id,winning_max FROM (
  SELECT x.user_telegram_id AS user_id,x.max_amount AS max_value,x.created_at AS priority
  FROM public.galaxy_direction_proxy_maxima x
  WHERE x.direction=p_direction AND x.lot_number=p_lot_number
  UNION ALL SELECT p_user_telegram_id,candidate,now()
  WHERE p_mode='manual'
 ) contenders ORDER BY max_value DESC,priority ASC,user_id ASC LIMIT 1;
 IF winner_id IS NULL THEN RAISE EXCEPTION 'No bidder'; END IF;
 SELECT max(contenders.max_value) INTO runner_max FROM (
  SELECT x.user_telegram_id AS user_id,x.max_amount AS max_value
  FROM public.galaxy_direction_proxy_maxima x WHERE x.direction=p_direction AND x.lot_number=p_lot_number
  UNION ALL SELECT p_user_telegram_id,candidate WHERE p_mode='manual'
 ) contenders WHERE contenders.user_id<>winner_id;
 final_price:=least(winning_max,greatest(s.current_bid+100,coalesce(runner_max+100,s.current_bid+100)));
 IF final_price<=s.current_bid THEN RAISE EXCEPTION 'No price increase'; END IF;
 UPDATE public.galaxy_auction_sessions x SET current_bid=final_price,phase='red',
 phase_started_at=now(),updated_at=now() WHERE x.direction=p_direction;
 INSERT INTO public.galaxy_auction_bid_events(direction,lot_number,user_telegram_id,amount)
 VALUES(p_direction,p_lot_number,winner_id,final_price) RETURNING id INTO new_event;
 RETURN QUERY SELECT new_event,final_price;
END;
$$;
REVOKE ALL ON FUNCTION public.galaxy_direction_submit_bid(text,bigint,text,text,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.galaxy_direction_submit_bid(text,bigint,text,text,numeric) TO service_role;
COMMIT;
