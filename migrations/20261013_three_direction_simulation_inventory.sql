-- Isolated simulation inventory. Never updates USA LIVE, production lots, bids, users or results.
BEGIN;
CREATE TABLE IF NOT EXISTS public.galaxy_sim_sessions (
 direction text PRIMARY KEY CHECK(direction IN ('usa','dubai','transfer')),
 enabled boolean NOT NULL DEFAULT false,
 phase text NOT NULL DEFAULT 'waiting' CHECK(phase IN ('waiting','red','green','bonus','sold','finished')),
 current_position integer NOT NULL DEFAULT 1 CHECK(current_position BETWEEN 1 AND 5),
 phase_started_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT sim_enabled_phase CHECK ((enabled AND phase NOT IN ('waiting','finished')) OR (NOT enabled AND phase IN ('waiting','finished')))
);
CREATE TABLE IF NOT EXISTS public.galaxy_sim_lots (
 direction text NOT NULL REFERENCES public.galaxy_sim_sessions(direction),
 position integer NOT NULL CHECK(position BETWEEN 1 AND 5),
 sim_lot_id text NOT NULL UNIQUE,
 display_name text NOT NULL,
 starting_bid numeric(18,2) NOT NULL CHECK(starting_bid>0),
 current_bid numeric(18,2) NOT NULL CHECK(current_bid>=starting_bid),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','live','sold','unsold')),
 PRIMARY KEY(direction,position)
);
CREATE TABLE IF NOT EXISTS public.galaxy_sim_bid_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 direction text NOT NULL,
 position integer NOT NULL,
 participant_alias text NOT NULL CHECK(length(participant_alias) BETWEEN 1 AND 80),
 amount numeric(18,2) NOT NULL CHECK(amount>0),
 mode text NOT NULL CHECK(mode IN ('manual','proxy')),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(direction,position) REFERENCES public.galaxy_sim_lots(direction,position)
);
CREATE TABLE IF NOT EXISTS public.galaxy_sim_proxy_maxima (
 direction text NOT NULL,
 position integer NOT NULL,
 participant_alias text NOT NULL,
 maximum numeric(18,2) NOT NULL CHECK(maximum>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(direction,position,participant_alias),
 FOREIGN KEY(direction,position) REFERENCES public.galaxy_sim_lots(direction,position)
);
CREATE TABLE IF NOT EXISTS public.galaxy_sim_results (
 direction text NOT NULL,
 position integer NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('sold','unsold')),
 winner_alias text,
 winning_price numeric(18,2),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(direction,position),
 FOREIGN KEY(direction,position) REFERENCES public.galaxy_sim_lots(direction,position),
 CONSTRAINT sim_result_consistent CHECK (
  (outcome='sold' AND winner_alias IS NOT NULL AND winning_price IS NOT NULL AND winning_price>0)
  OR (outcome='unsold' AND winner_alias IS NULL AND winning_price IS NULL)
 )
);
INSERT INTO public.galaxy_sim_sessions(direction) VALUES ('usa'),('dubai'),('transfer') ON CONFLICT DO NOTHING;
INSERT INTO public.galaxy_sim_lots(direction,position,sim_lot_id,display_name,starting_bid,current_bid)
SELECT d.direction,p.n,'SIM-'||upper(d.direction)||'-'||lpad(p.n::text,2,'0'),
 'DEMO ONLY — '||upper(d.direction)||' — Vehicle '||p.n,
 CASE d.direction WHEN 'usa' THEN 8000 WHEN 'dubai' THEN 12000 ELSE 9000 END + (p.n-1)*500,
 CASE d.direction WHEN 'usa' THEN 8000 WHEN 'dubai' THEN 12000 ELSE 9000 END + (p.n-1)*500
FROM (VALUES ('usa'),('dubai'),('transfer')) AS d(direction)
CROSS JOIN generate_series(1,5) AS p(n)
ON CONFLICT(direction,position) DO NOTHING;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.galaxy_sim_lots)<>15
 OR EXISTS(SELECT 1 FROM public.galaxy_sim_sessions WHERE enabled OR phase<>'waiting')
 THEN RAISE EXCEPTION 'Simulation inventory is not safely waiting'; END IF;
END $$;
ALTER TABLE public.galaxy_sim_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galaxy_sim_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galaxy_sim_bid_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galaxy_sim_proxy_maxima ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galaxy_sim_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.galaxy_sim_sessions,public.galaxy_sim_lots,public.galaxy_sim_bid_events,public.galaxy_sim_proxy_maxima,public.galaxy_sim_results FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.galaxy_sim_sessions,public.galaxy_sim_lots,public.galaxy_sim_proxy_maxima TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.galaxy_sim_results TO service_role;
GRANT SELECT,INSERT ON public.galaxy_sim_bid_events TO service_role;
COMMIT;
