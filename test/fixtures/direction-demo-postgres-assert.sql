\set ON_ERROR_STOP on
DO $$
DECLARE a numeric; b numeric;
BEGIN
 SELECT public.galaxy_demo_bid('101','proxy',15000) INTO a;
 IF a<>12600 THEN RAISE EXCEPTION 'Unexpected first proxy price %',a; END IF;
 SELECT public.galaxy_demo_bid('102','manual',1000) INTO b;
 IF b<>13700 THEN RAISE EXCEPTION 'Unexpected competition price %',b; END IF;
 IF (SELECT user_telegram_id FROM public.galaxy_demo_bid_events ORDER BY id DESC LIMIT 1)<>'101'
 THEN RAISE EXCEPTION 'Wrong demo leader'; END IF;
 IF (SELECT count(*) FROM public.galaxy_auction_bid_events)<>0
 THEN RAISE EXCEPTION 'Demo modified real bid events'; END IF;
 IF (SELECT current_bid FROM public.galaxy_auction_sessions WHERE direction='dubai')<>10000
 THEN RAISE EXCEPTION 'Demo modified real Dubai session'; END IF;
 BEGIN
  PERFORM public.galaxy_demo_bid('103','manual',100);
  RAISE EXCEPTION 'Inactive demo bidder accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='Inactive demo bidder accepted' THEN RAISE; END IF;
 END;
END $$;
