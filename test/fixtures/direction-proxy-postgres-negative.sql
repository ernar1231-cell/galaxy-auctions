\set ON_ERROR_STOP on
-- Additional safe negative-path tests; only executed against ephemeral PostgreSQL.
DO $$
DECLARE before_bid numeric; before_count bigint;
BEGIN
 SELECT current_bid INTO before_bid FROM public.galaxy_auction_sessions WHERE direction='dubai';
 SELECT count(*) INTO before_count FROM public.galaxy_auction_bid_events WHERE direction='dubai';
 BEGIN
  PERFORM * FROM public.galaxy_direction_submit_bid('dubai',69,'103','proxy',15000);
  RAISE EXCEPTION 'Inactive bidder accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='Inactive bidder accepted' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM * FROM public.galaxy_direction_submit_bid('dubai',70,'101','proxy',15000);
  RAISE EXCEPTION 'Cross-direction lot accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='Cross-direction lot accepted' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM * FROM public.galaxy_direction_submit_bid('usa',69,'101','manual',100);
  RAISE EXCEPTION 'USA direction accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='USA direction accepted' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM * FROM public.galaxy_direction_submit_bid('dubai',69,'101','proxy',999999);
  RAISE EXCEPTION 'Excessive maximum accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='Excessive maximum accepted' THEN RAISE; END IF;
 END;
 IF (SELECT current_bid FROM public.galaxy_auction_sessions WHERE direction='dubai')<>before_bid
 OR (SELECT count(*) FROM public.galaxy_auction_bid_events WHERE direction='dubai')<>before_count
 THEN RAISE EXCEPTION 'Rejected bid mutated auction'; END IF;
 IF EXISTS(SELECT 1 FROM public.galaxy_direction_proxy_maxima WHERE user_telegram_id='103')
 THEN RAISE EXCEPTION 'Rejected proxy persisted'; END IF;
END $$;
