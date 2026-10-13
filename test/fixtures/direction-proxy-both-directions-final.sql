\set ON_ERROR_STOP on
-- Run only in disposable CI PostgreSQL; rollback leaves prior fixture unchanged.
BEGIN;
DELETE FROM public.galaxy_auction_bid_events;
DELETE FROM public.galaxy_direction_proxy_maxima;
UPDATE public.galaxy_auction_sessions
SET phase='red',phase_started_at=clock_timestamp(),current_bid=CASE WHEN direction='dubai' THEN 10000 WHEN direction='transfer' THEN 20000 ELSE 0 END
WHERE direction IN ('dubai','transfer');
DO $$
DECLARE r record; before_events bigint;
BEGIN
 SELECT * INTO r FROM public.galaxy_direction_submit_bid('dubai',69,'101','manual',100);
 IF r.new_bid<>10100 THEN RAISE EXCEPTION 'Dubai +100 failed: %',r.new_bid; END IF;
 SELECT * INTO r FROM public.galaxy_direction_submit_bid('dubai',69,'102','manual',1000);
 IF r.new_bid<>11100 THEN RAISE EXCEPTION 'Dubai +1000 failed: %',r.new_bid; END IF;
 SELECT * INTO r FROM public.galaxy_direction_submit_bid('dubai',69,'101','proxy',15000);
 IF r.new_bid<>11200 THEN RAISE EXCEPTION 'Dubai proxy response failed: %',r.new_bid; END IF;
 SELECT * INTO r FROM public.galaxy_direction_submit_bid('dubai',69,'102','proxy',16000);
 IF r.new_bid<>15100 THEN RAISE EXCEPTION 'Dubai competing proxy maximum failed: %',r.new_bid; END IF;
 SELECT count(*) INTO before_events FROM public.galaxy_auction_bid_events WHERE direction='dubai';
 SELECT * INTO r FROM public.galaxy_direction_submit_bid('dubai',69,'102','proxy',18000);
 IF r.new_bid<>15100 THEN RAISE EXCEPTION 'Own max changed price: %',r.new_bid; END IF;
 IF (SELECT count(*) FROM public.galaxy_auction_bid_events WHERE direction='dubai')<>before_events
 THEN RAISE EXCEPTION 'Own max created extra bid event'; END IF;
 IF (SELECT user_telegram_id FROM public.galaxy_auction_bid_events WHERE direction='dubai' ORDER BY id DESC LIMIT 1)<>'102'
 THEN RAISE EXCEPTION 'Dubai wrong leader'; END IF;
 SELECT * INTO r FROM public.galaxy_direction_submit_bid('transfer',70,'102','manual',1000);
 IF r.new_bid<>21000 THEN RAISE EXCEPTION 'Transit +1000 failed: %',r.new_bid; END IF;
 SELECT * INTO r FROM public.galaxy_direction_submit_bid('transfer',70,'101','proxy',25000);
 IF r.new_bid<>21100 THEN RAISE EXCEPTION 'Transit proxy failed: %',r.new_bid; END IF;
 IF (SELECT current_bid FROM public.galaxy_auction_sessions WHERE direction='dubai')<>15100
 THEN RAISE EXCEPTION 'Transit modified Dubai price'; END IF;
 IF (SELECT count(*) FROM public.galaxy_direction_proxy_maxima WHERE direction='transfer')<>1
 OR (SELECT count(*) FROM public.galaxy_direction_proxy_maxima WHERE direction='dubai')<>2
 THEN RAISE EXCEPTION 'Proxy maxima directions mixed'; END IF;
 IF (SELECT count(*) FROM public.galaxy_auction_bid_events WHERE direction='usa')<>0
 THEN RAISE EXCEPTION 'USA event created'; END IF;
END $$;
ROLLBACK;
