\set ON_ERROR_STOP on
DO $$
DECLARE d text;
BEGIN
 IF (SELECT count(*) FROM public.galaxy_sim_lots)<>15 THEN RAISE EXCEPTION 'Expected exactly 15 demo lots'; END IF;
 FOR d IN SELECT unnest(ARRAY['usa','dubai','transfer'])
 LOOP
  IF (SELECT count(*) FROM public.galaxy_sim_lots WHERE direction=d)<>5
  THEN RAISE EXCEPTION 'Missing five lots for %',d; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.galaxy_sim_sessions WHERE direction=d AND enabled=false AND phase='waiting' AND current_position=1)
  THEN RAISE EXCEPTION 'Direction unexpectedly started: %',d; END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.galaxy_sim_bid_events)<>0
 OR (SELECT count(*) FROM public.galaxy_sim_proxy_maxima)<>0
 OR (SELECT count(*) FROM public.galaxy_sim_results)<>0
 THEN RAISE EXCEPTION 'Test state must be empty'; END IF;
 IF EXISTS(SELECT 1 FROM public.galaxy_sim_lots WHERE sim_lot_id NOT LIKE 'SIM-%' OR status<>'queued')
 THEN RAISE EXCEPTION 'Invalid demo lot'; END IF;
 IF to_regclass('public.auction_lots') IS NOT NULL THEN RAISE EXCEPTION 'Simulation fixture must not contain production auction tables'; END IF;
END $$;
-- Repeat migration to verify idempotency before release.
