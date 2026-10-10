-- Phase 1: isolated auction sessions. No changes to existing USA auction_state or auction_bids.
-- Review and apply in Supabase SQL editor only after verifying a backup.
BEGIN;
CREATE TABLE IF NOT EXISTS public.galaxy_auction_sessions (
 direction text PRIMARY KEY CHECK (direction IN ('usa','dubai','transfer')),
 enabled boolean NOT NULL DEFAULT false,
 timezone text NOT NULL DEFAULT 'Asia/Dubai',
 local_start time NOT NULL DEFAULT TIME '18:00',
 current_lot_number bigint,
 phase text NOT NULL DEFAULT 'waiting' CHECK (phase IN ('waiting','red','green','bonus','sold')),
 current_bid numeric(18,2) NOT NULL DEFAULT 0 CHECK (current_bid >= 0),
 phase_started_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.galaxy_auction_sessions(direction,enabled)
VALUES ('usa',false),('dubai',false),('transfer',false)
ON CONFLICT (direction) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.galaxy_auction_lot_assignments (
 lot_number bigint PRIMARY KEY,
 direction text NOT NULL REFERENCES public.galaxy_auction_sessions(direction),
 queue_position integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS galaxy_auction_lot_direction_queue_idx
ON public.galaxy_auction_lot_assignments(direction,queue_position,lot_number);
CREATE TABLE IF NOT EXISTS public.galaxy_auction_bid_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 direction text NOT NULL REFERENCES public.galaxy_auction_sessions(direction),
 lot_number bigint NOT NULL,
 user_telegram_id text NOT NULL,
 amount numeric(18,2) NOT NULL CHECK (amount > 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS galaxy_auction_bid_events_direction_lot_idx
ON public.galaxy_auction_bid_events(direction,lot_number,created_at DESC);
ALTER TABLE public.galaxy_auction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galaxy_auction_lot_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galaxy_auction_bid_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.galaxy_auction_sessions FROM anon,authenticated;
REVOKE ALL ON public.galaxy_auction_lot_assignments FROM anon,authenticated;
REVOKE ALL ON public.galaxy_auction_bid_events FROM anon,authenticated;
-- No client write policy: bids must be validated by a server-side transactional RPC
-- that checks deposit, auction phase, direction, price and lot before insert.
COMMIT;
