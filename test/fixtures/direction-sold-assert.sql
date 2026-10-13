\set ON_ERROR_STOP on
DO $$
DECLARE r record;
BEGIN
 SELECT * INTO r FROM public.galaxy_advance_direction_lot('dubai',69);
 IF r.changed IS DISTINCT FROM true OR r.current_lot_number<>71 OR r.phase<>'red' THEN RAISE EXCEPTION 'Dubai did not advance'; END IF;
 IF (SELECT winner_telegram_id FROM public.galaxy_auction_results WHERE direction='dubai' AND lot_number=69)<>'101'
 OR (SELECT winning_amount FROM public.galaxy_auction_results WHERE direction='dubai' AND lot_number=69)<>12600
 THEN RAISE EXCEPTION 'Wrong Dubai SOLD result'; END IF;
 IF (SELECT status FROM public.auction_lots WHERE lot_number=69)<>'pending'
 OR (SELECT status FROM public.auction_lots WHERE lot_number=71)<>'live'
 OR (SELECT current_bid FROM public.galaxy_auction_sessions WHERE direction='dubai')<>15000
 THEN RAISE EXCEPTION 'Dubai lot states incorrect'; END IF;
 SELECT * INTO r FROM public.galaxy_advance_direction_lot('dubai',69);
 IF r.changed IS DISTINCT FROM false THEN RAISE EXCEPTION 'Duplicate Dubai SOLD accepted'; END IF;
 IF (SELECT count(*) FROM public.galaxy_auction_results WHERE direction='dubai')<>1 THEN RAISE EXCEPTION 'Duplicate result'; END IF;
 SELECT * INTO r FROM public.galaxy_advance_direction_lot('transfer',70);
 IF r.changed IS DISTINCT FROM true OR r.current_lot_number<>72 THEN RAISE EXCEPTION 'Transit did not advance'; END IF;
 IF EXISTS(SELECT 1 FROM public.galaxy_auction_results WHERE direction='transfer')
 THEN RAISE EXCEPTION 'Unsold Transit got winner'; END IF;
 IF (SELECT status FROM public.auction_lots WHERE lot_number=70)<>'draft'
 OR (SELECT status FROM public.auction_lots WHERE lot_number=72)<>'live'
 THEN RAISE EXCEPTION 'Transit unsold state wrong'; END IF;
 IF (SELECT enabled FROM public.galaxy_auction_sessions WHERE direction='usa') IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'USA changed'; END IF;
END $$;
UPDATE public.galaxy_auction_sessions SET phase='sold',phase_started_at=clock_timestamp()-interval '5 seconds',current_bid=15000 WHERE direction='dubai';
DO $$
DECLARE r record;
BEGIN
 SELECT * INTO r FROM public.galaxy_advance_direction_lot('dubai',71);
 IF r.changed IS DISTINCT FROM true OR r.phase<>'waiting' THEN RAISE EXCEPTION 'Final lot did not stop'; END IF;
 IF (SELECT enabled FROM public.galaxy_auction_sessions WHERE direction='dubai') IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Auction still enabled after final lot'; END IF;
END $$;
