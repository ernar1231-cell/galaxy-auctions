-- Isolated immutable sale results. No USA auction_state changes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.galaxy_auction_results (
 direction text NOT NULL CHECK(direction IN ('dubai','transfer')),
 lot_number bigint NOT NULL,
 winner_telegram_id text NOT NULL,
 winning_amount numeric(18,2) NOT NULL CHECK(winning_amount>0),
 winning_bid_event_id bigint NOT NULL UNIQUE REFERENCES public.galaxy_auction_bid_events(id),
 result_status text NOT NULL DEFAULT 'pending_approval' CHECK(result_status IN ('pending_approval','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(direction,lot_number)
);
CREATE INDEX IF NOT EXISTS galaxy_auction_results_created_idx ON public.galaxy_auction_results(created_at DESC);
ALTER TABLE public.galaxy_auction_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.galaxy_auction_results FROM anon,authenticated;
-- Only server role writes results after a transactional SOLD check.
COMMIT;
