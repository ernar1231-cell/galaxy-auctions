# Galaxy Auctions — PR #189 baseline

Baseline commit: `47371445a76f86916620b9009ffb7a0ebf62698f` (merged PR #189).

This branch is an **isolated development baseline**, not a production rollback. Do not force-push `main`, deploy this branch to production, delete existing vehicles, or alter USA LIVE behavior.

## Agreed design (not implemented)

- One existing GitHub repository, Vercel project, and production Supabase database.
- One reusable auction-screen layout and server-side bid engine, with strict per-direction isolation of lots, bids, proxy maxima, sessions, winners, and results.
- Direction selection screen with three cards: USA LIVE, Dubai Auctions, Transit.
- Daily Dubai-local schedule: USA 13:00–17:00; Dubai 17:00–21:00; Transit 21:00–01:00 (next day). Do **not** change the existing USA schedule without separate approval.
- Target capacity: 100 lots per direction, display positions 1–100 in each direction; keep unique internal identifiers.
- Reuse current Active user eligibility, with server-side checks for each direction.
- Preserve USA LIVE code, current behavior, existing lots, data, and integrations. Add Dubai and Transit functionality in separate modules and migrations.

## Work sequence

1. Compare baseline against current main; identify existing UI and data models without changing USA LIVE.
2. Introduce independent direction and lot mapping, with non-destructive migrations and uniqueness constraints.
3. Reuse USA visual layout for Dubai and Transit, changing only direction, lot, timer, price and direction-scoped events.
4. Add direction-scoped authorization and atomic bids (+100/+1000/Proxy), transitions and result handling.
5. Validate with CI, isolated test runs, two real Telegram sessions, and independent three-direction checks.
6. Only after successful checks and explicit approval, merge/deploy new functionality.

## Existing work

PR #287 is unfinished staging work. PR #288 is a separate direction-entry change. Neither is automatically merged into this baseline.

**This document records a plan, not completed functionality.**
