\set ON_ERROR_STOP on
-- Isolated PostgreSQL only: exercise eligibility for both manual and proxy bids.
BEGIN;
INSERT INTO public.auction_users(telegram_id,account_status,deposit_amount,bid_limit)
VALUES ('104','pending',1000,50000),('105','active',0,50000),('106','active',1000,10050),
('107','active',1000,50000);
DO $$
DECLARE before_events bigint; before_proxy bigint; before_price numeric;
DECLARE direction_name text; lot bigint; person text; mode_name text; amount numeric;
BEGIN
 FOR direction_name,lot IN SELECT direction,current_lot_number FROM public.galaxy_auction_sessions WHERE direction IN ('dubai','transfer')
 LOOP
  FOR person,mode_name,amount IN
   SELECT * FROM (VALUES
    ('103'::text,'manual'::text,100::numeric),
    ('103','proxy',50000),('104','manual',100),('104','proxy',50000),
    ('105','manual',100),('105','proxy',50000),
    ('106','manual',1000),('106','proxy',50000),
    ('999','manual',100),('999','proxy',50000)) AS rejected(person,mode_name,amount)
  LOOP
   SELECT count(*) INTO before_events FROM public.galaxy_auction_bid_events;
   SELECT count(*) INTO before_proxy FROM public.galaxy_direction_proxy_maxima;
   SELECT current_bid INTO before_price FROM public.galaxy_auction_sessions WHERE direction=direction_name;
   BEGIN
    PERFORM * FROM public.galaxy_direction_submit_bid(direction_name,lot,person,mode_name,amount);
    RAISE EXCEPTION 'Unauthorized bid accepted';
   EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='Unauthorized bid accepted' THEN RAISE; END IF;
   END;
   IF (SELECT count(*) FROM public.galaxy_auction_bid_events)<>before_events
   OR (SELECT count(*) FROM public.galaxy_direction_proxy_maxima)<>before_proxy
   OR (SELECT current_bid FROM public.galaxy_auction_sessions WHERE direction=direction_name)<>before_price
   THEN RAISE EXCEPTION 'Rejected offer mutated state'; END IF;
  END LOOP;
 END LOOP;
END $$;
ROLLBACK;
