# Galaxy Auctions — safe multi-LIVE rollout

1. Back up Supabase. Review and apply `migrations/20261010_multi_auction_foundation.sql` using a privileged SQL migration runner. GitHub merge alone does not apply SQL.
2. Confirm three `galaxy_auction_sessions` rows exist and all have `enabled=false`. Existing `auction_state` and `auction_bids` must remain unchanged.
3. Backfill `galaxy_auction_lot_assignments` from existing `[GALAXY_DIRECTION:...]` metadata. Review legacy USA fallback and duplicates before inserting. Do not change lot status automatically.
4. Implement server-side atomic bid RPC and transaction: verify Telegram identity, deposit eligibility, selected direction, active session/lot, auction phase, increment, limits and duplicate/replay protection. Lock the session row while bidding. Test simultaneous bids.
5. Implement separate schedule and queue advance per direction, 18:00 Asia/Dubai. Avoid scheduling all sessions against USA state id=1.
6. Refactor LIVE UI to consume a direction parameter, preserving USA appearance. Test Dubai lot 69 and transit lot 70 in staging with simulated bids only.
7. Only after staging tests and audit enable sessions one at a time, with rollback and monitoring. Keep USA existing endpoints until migration proven.

This change is schema preparation only. It does not start Dubai or transit bidding.
