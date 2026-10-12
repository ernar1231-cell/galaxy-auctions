# Dubai / Transit scheduler worker (draft deployment)

The 15-second RED/GREEN/BONUS and 2-second SOLD phases are authoritative in the database. A Vercel one-minute Cron is **not** sufficiently frequent to apply these transitions. The long-running Node.js worker in `scripts/direction-scheduler-worker.js` calls the existing authenticated `POST /api/direction-phase-tick` every 1000 ms (configurable 500–5000 ms). It does not enable or arm auctions.

Required environment variables on the **separate worker host**:
- `GALAXY_SCHEDULER_ENDPOINT=https://<deployment>/api/direction-phase-tick`
- `GALAXY_SCHEDULER_SECRET=<same strong secret configured on the API host>`
- Optional `GALAXY_SCHEDULER_INTERVAL_MS=1000`

Run under a process supervisor with automatic restart, health monitoring, and **one active worker instance**. Do not put the worker into Vercel serverless functions or deploy the draft minute Cron (#224). The worker performs sequential calls to avoid local overlap. Database RPCs must enforce atomic phase/lot checks so retries and other instances cannot double-transition.

**Limitations:** This is best-effort approximately 1-second tick cadence, not hard real-time 15-second execution. Network latency, process restarts and platform pauses can delay phase transitions. Never treat a frontend countdown as authority. Production activation requires a supervised always-on host, installed reviewed database migrations, configured secrets, and an end-to-end staging test of winner persistence, lot status, Telegram bidding and schedule. Keep `GALAXY_DIRECTION_BIDDING_ENABLED` unset/false and sessions unarmed until then. USA LIVE remains unchanged.
