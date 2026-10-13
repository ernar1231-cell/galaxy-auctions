-- Disposable PostgreSQL fixture only. Never apply this schema to production.
CREATE ROLE service_role;
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE TABLE public.galaxy_auction_sessions(
 direction text PRIMARY KEY,enabled boolean NOT NULL,phase text NOT NULL,
 current_lot_number bigint,phase_started_at timestamptz,current_bid numeric NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.galaxy_auction_lot_assignments(
 lot_number bigint PRIMARY KEY,direction text NOT NULL,queue_position integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.auction_lots(
 lot_number bigint PRIMARY KEY,starting_bid numeric NOT NULL DEFAULT 0,
 status text NOT NULL,description text,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.galaxy_auction_bid_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 direction text NOT NULL,lot_number bigint NOT NULL,user_telegram_id text NOT NULL,
 amount numeric NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.galaxy_auction_results(
 direction text NOT NULL,lot_number bigint NOT NULL,winner_telegram_id text NOT NULL,
 winning_amount numeric NOT NULL,winning_bid_event_id bigint NOT NULL,
 result_status text NOT NULL DEFAULT 'pending_approval',
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(direction,lot_number)
);
INSERT INTO public.galaxy_auction_sessions(direction,enabled,phase,current_lot_number,phase_started_at,current_bid)
VALUES ('dubai',true,'sold',69,clock_timestamp()-interval '5 seconds',12600),
('transfer',true,'sold',70,clock_timestamp()-interval '5 seconds',9500),
('usa',false,'waiting',NULL,NULL,0);
INSERT INTO public.galaxy_auction_lot_assignments(lot_number,direction,queue_position)
VALUES (69,'dubai',1),(71,'dubai',2),(70,'transfer',1),(72,'transfer',2);
INSERT INTO public.auction_lots(lot_number,starting_bid,status,description)
VALUES (69,12500,'live','[GALAXY_DIRECTION:{"direction":"dubai"}]'),
(71,15000,'upcoming','[GALAXY_DIRECTION:{"direction":"dubai"}]'),
(70,9500,'live','[GALAXY_DIRECTION:{"direction":"transfer"}]'),
(72,11000,'upcoming','[GALAXY_DIRECTION:{"direction":"transfer"}]');
INSERT INTO public.galaxy_auction_bid_events(direction,lot_number,user_telegram_id,amount)
VALUES ('dubai',69,'101',12600);
