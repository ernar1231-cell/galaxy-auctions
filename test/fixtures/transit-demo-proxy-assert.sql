\set ON_ERROR_STOP on
DO $$
DECLARE a numeric;b numeric;c numeric;
BEGIN
 SELECT public.galaxy_transit_demo_bid('101','proxy',15000) INTO a;
 IF a<>9600 THEN RAISE EXCEPTION 'Transit proxy initial %',a; END IF;
 SELECT public.galaxy_transit_demo_bid('102','manual',1000) INTO b;
 IF b<>10700 THEN RAISE EXCEPTION 'Transit proxy competition %',b; END IF;
 SELECT public.galaxy_transit_demo_bid('102','proxy',16000) INTO c;
 IF c<>15100 THEN RAISE EXCEPTION 'Transit competing proxy maximum %',c; END IF;
 IF (SELECT current_bid FROM public.galaxy_demo_lot_state WHERE direction='dubai')<>12500
 THEN RAISE EXCEPTION 'Transit touched Dubai'; END IF;
 IF (SELECT count(*) FROM public.galaxy_auction_bid_events)<>0
 THEN RAISE EXCEPTION 'Demo touched real bid events'; END IF;
END $$;
