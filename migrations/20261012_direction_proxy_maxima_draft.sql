-- Dubai/Transit proxy maximum storage. Draft for staging review; NOT applied to production.
-- USA LIVE proxy bids use auction_bids and remain unchanged.
BEGIN;
CREATE TABLE IF NOT EXISTS public.galaxy_direction_proxy_maxima (
 direction text NOT NULL REFERENCES public.galaxy_auction_sessions(direction),
 lot_number bigint NOT NULL REFERENCES public.galaxy_auction_lot_assignments(lot_number),
 user_telegram_id text NOT NULL REFERENCES public.auction_users(telegram_id),
 max_amount numeric(18,2) NOT NULL CHECK (max_amount > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(direction,lot_number,user_telegram_id),
 CONSTRAINT galaxy_direction_proxy_only CHECK(direction IN ('dubai','transfer'))
);
ALTER TABLE public.galaxy_direction_proxy_maxima ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.galaxy_direction_proxy_maxima FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.galaxy_direction_proxy_maxima TO service_role;

CREATE OR REPLACE FUNCTION public.galaxy_set_direction_proxy_max(
 p_direction text,p_lot_number bigint,p_user_telegram_id text,p_max_amount numeric
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.galaxy_auction_sessions%ROWTYPE;
DECLARE u public.auction_users%ROWTYPE;
DECLARE old_max numeric;
BEGIN
 IF p_direction NOT IN ('dubai','transfer') OR p_lot_number IS NULL OR
    nullif(p_user_telegram_id,'') IS NULL OR p_max_amount IS NULL OR
    p_max_amount<=0 THEN RAISE EXCEPTION 'Invalid proxy parameters'; END IF;
 SELECT * INTO s FROM public.galaxy_auction_sessions x
 WHERE x.direction=p_direction FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Direction session missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.galaxy_auction_lot_assignments a
 WHERE a.direction=p_direction AND a.lot_number=p_lot_number)
 THEN RAISE EXCEPTION 'Lot not assigned to direction'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.auction_lots l WHERE l.lot_number=p_lot_number
 AND l.status IN ('upcoming','live') AND
 position('"direction":"'||p_direction||'"' in replace(coalesce(l.description,''),chr(92),''))>0)
 THEN RAISE EXCEPTION 'Lot not available for direction'; END IF;
 IF s.enabled=true AND s.current_lot_number=p_lot_number AND
    (s.phase NOT IN ('red','green','bonus') OR s.phase_started_at IS NULL OR
     now()>=s.phase_started_at+interval '15 seconds')
 THEN RAISE EXCEPTION 'Proxy bidding closed for lot'; END IF;
 SELECT * INTO u FROM public.auction_users x WHERE x.telegram_id=p_user_telegram_id;
 IF NOT FOUND OR lower(coalesce(u.account_status,''))<>'active' OR
    coalesce(u.deposit_amount,0)<=0 OR u.bid_limit<p_max_amount
 THEN RAISE EXCEPTION 'Proxy deposit or limit not permitted'; END IF;
 SELECT x.max_amount INTO old_max FROM public.galaxy_direction_proxy_maxima x
 WHERE x.direction=p_direction AND x.lot_number=p_lot_number
 AND x.user_telegram_id=p_user_telegram_id FOR UPDATE;
 IF old_max IS NOT NULL AND p_max_amount<old_max THEN
  RAISE EXCEPTION 'Proxy maximum cannot be reduced'; END IF;
 INSERT INTO public.galaxy_direction_proxy_maxima(direction,lot_number,user_telegram_id,max_amount)
 VALUES(p_direction,p_lot_number,p_user_telegram_id,p_max_amount)
 ON CONFLICT(direction,lot_number,user_telegram_id)
 DO UPDATE SET max_amount=excluded.max_amount,updated_at=now();
 RETURN p_max_amount;
END;
$$;
REVOKE ALL ON FUNCTION public.galaxy_set_direction_proxy_max(text,bigint,text,numeric)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.galaxy_set_direction_proxy_max(text,bigint,text,numeric)
 TO service_role;
COMMIT;
