\set ON_ERROR_STOP on
-- SQL integration assertions execute in a throwaway PostgreSQL container only.
DO $$
DECLARE r record;
BEGIN
 SELECT * INTO r FROM public.galaxy_direction_submit_bid('dubai',69,'101','proxy',15000);
 IF r.new_bid<>10100 THEN RAISE EXCEPTION 'Initial proxy bid: %',r.new_bid; END IF;
 SELECT * INTO r FROM public.galaxy_direction_submit_bid('dubai',69,'102','manual',1000);
 IF r.new_bid<>11200 THEN RAISE EXCEPTION 'Proxy response to manual: %',r.new_bid; END IF;
 IF (SELECT user_telegram_id FROM public.galaxy_auction_bid_events WHERE direction='dubai' ORDER BY id DESC LIMIT 1)<>'101'
 THEN RAISE EXCEPTION 'Wrong proxy leader'; END IF;
 SELECT * INTO r FROM public.galaxy_direction_submit_bid('dubai',69,'101','proxy',16000);
 IF r.new_bid<>11200 THEN RAISE EXCEPTION 'Leader raised own price: %',r.new_bid; END IF;
 IF (SELECT count(*) FROM public.galaxy_auction_bid_events WHERE direction='dubai')<>2
 THEN RAISE EXCEPTION 'Unexpected duplicate proxy event'; END IF;
 SELECT * INTO r FROM public.galaxy_direction_submit_bid('transfer',70,'102','proxy',30000);
 IF r.new_bid<>20100 THEN RAISE EXCEPTION 'Transit initial price: %',r.new_bid; END IF;
 IF (SELECT current_bid FROM public.galaxy_auction_sessions WHERE direction='dubai')<>11200
 THEN RAISE EXCEPTION 'Directions contaminated'; END IF;
 IF (SELECT count(*) FROM public.galaxy_auction_bid_events WHERE direction='usa')<>0
 THEN RAISE EXCEPTION 'USA modified'; END IF;
END $$;
UPDATE public.galaxy_auction_sessions SET phase_started_at=clock_timestamp()-interval '20 seconds' WHERE direction='dubai';
DO $$
BEGIN
 BEGIN
  PERFORM * FROM public.galaxy_direction_submit_bid('dubai',69,'102','manual',100);
  RAISE EXCEPTION 'Expired bid unexpectedly accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='Expired bid unexpectedly accepted' THEN RAISE; END IF;
 END;
END $$;
