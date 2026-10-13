-- Minimal isolated fixture; never run against production.
CREATE TABLE public.galaxy_auction_sessions(
 direction text PRIMARY KEY,enabled boolean NOT NULL DEFAULT false,
 current_lot_number bigint,phase text NOT NULL DEFAULT 'waiting',
 phase_started_at timestamptz,current_bid numeric NOT NULL DEFAULT 0,updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.galaxy_auction_lot_assignments(
 lot_number bigint PRIMARY KEY,direction text NOT NULL REFERENCES public.galaxy_auction_sessions(direction)
);
CREATE TABLE public.auction_users(
 telegram_id text UNIQUE NOT NULL,account_status text NOT NULL,
 deposit_amount numeric NOT NULL,bid_limit numeric NOT NULL
);
CREATE TABLE public.auction_lots(
 lot_number bigint PRIMARY KEY,status text NOT NULL,description text
);
CREATE TABLE public.galaxy_auction_bid_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 direction text NOT NULL,lot_number bigint NOT NULL,user_telegram_id text NOT NULL,
 amount numeric NOT NULL,created_at timestamptz DEFAULT now()
);
CREATE ROLE service_role;
CREATE ROLE anon;
CREATE ROLE authenticated;
INSERT INTO public.galaxy_auction_sessions(direction,enabled,current_lot_number,phase,phase_started_at,current_bid)
 VALUES ('dubai',true,69,'red',clock_timestamp(),10000),('transfer',true,70,'red',clock_timestamp(),20000),('usa',false,null,'waiting',null,0);
INSERT INTO public.galaxy_auction_lot_assignments VALUES (69,'dubai'),(70,'transfer');
INSERT INTO public.auction_users VALUES ('101','active',1000,50000),('102','active',1000,50000),('103','inactive',0,50000);
INSERT INTO public.auction_lots VALUES
 (69,'live','[GALAXY_DIRECTION:{"direction":"dubai"}]'),
 (70,'live','[GALAXY_DIRECTION:{"direction":"transfer"}]');
