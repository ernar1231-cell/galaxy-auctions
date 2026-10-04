# Account information

The personal information editor uses the current Telegram account's existing
row in `public.auction_users`. It does not create another user or profile.
Email and phone remain the single canonical contact fields on that row.

## Deployment

Apply `migrations/20261004_account_information.sql` to the existing Supabase
database before deploying this feature. The migration adds only missing columns
and preserves existing values, Telegram IDs, usernames, financial fields, roles,
and RLS policies. It also restricts the personal columns to server-side access
while preserving existing browser access to nonpersonal columns.

The production schema, RLS rules, and `register_telegram_user` function
definitions are not present in this repository. Run the transactional migration
preflight against that database before deployment. It aborts with actionable
diagnostics if legacy RPCs or views expose personal fields or compatible types
and grants cannot be established; all transaction changes roll back.
Do not bypass a failing preflight by changing the application's Telegram
registration or lookup. Inspect the reported database contract before enabling
the editor. This PR does not apply a migration to the live database.

The endpoint reuses the existing server environment variables:

- `TELEGRAM_BOT_TOKEN` for the same Telegram initData verification as
  `api/admin-users.js`, including its auth_date checks;
- `SUPABASE_SERVICE_ROLE_KEY` for server-only database access;
- `SUPABASE_URL` for the existing database (the existing project URL is the
  fallback, matching the other API handlers).

Do not expose the service-role key to the browser. No new dependency or
environment variable is needed. If the migration has not been applied, the
endpoint responds with HTTP 503 and code `migration_required`. The editor
shows a temporary-unavailability error; it never claims a browser-only value
was saved.

## API and data

`POST /api/account-information` accepts Telegram `initData` and
`action: "read"` or `action: "update"`. Updates also require one allowed
`field` and its `value`. Identity always comes from verified initData;
a browser-supplied user ID is never used.

| Field | Update value | Storage |
| --- | --- | --- |
| Email | String; blank clears it | `email` (nullable text) |
| Phone | `{ number, country }` | `phone` (E.164), `phone_country` (region code) |
| Full name | String, at most 160 characters | `full_name` (nullable text) |
| Residence | `{ country, region, city, street }` | `residence_address` (nullable JSONB) |
| Postal code | String, at most 32 characters; letters allowed | `postal_code` (nullable text) |
| Mailing | `{ same_as_residence, address }` | `mailing_same_as_residence`, `mailing_address` (nullable JSONB) |

All responses on success are `{ information: { ... } }` with the eight
listed storage fields. When mailing matches residence, the separate mailing
address is stored as null and the returned effective mailing address comes
from the current residence. A later residence edit therefore also updates
the displayed mailing address.

Empty text clears a field to null. An entirely blank address clears it;
a populated address requires country, city, and street, with an optional
region. Address country, region, and city allow up to 100 characters each;
street allows 300. Email has basic format validation and a 254-character
limit. Phone supports AE, KZ, RU, US, GB, and GE; the selected region is stored
explicitly to distinguish countries sharing a dialing code. National input
or an international number matching the selected dialing code is normalized
to E.164. Country-specific length and shared-code prefixes are validated.

The database request is a targeted PATCH of only the edited field's columns,
filtered by the existing `telegram_id`. There is no insert or upsert and no
whole-account replacement. This avoids overwriting concurrent deposit,
bid-limit, role, or identity updates. Reads select only personal information.

## Interface and verification

Each Add/Edit action opens an enabled form with Cancel and Save. The form
keeps draft input separate from the persisted account until a successful
server response. After saving, the response updates the account view and the
existing top profile card's canonical email/phone fields. Opening the Mini
App again reloads personal information from the server.

Regression tests cover authenticated reads and targeted writes, validation,
a fresh server read after edits, mailing-address linkage, protected identity
and financial fields, editable forms, and top-card contact synchronization.
The existing profile and account initialization remain responsible for
Telegram identity, admin access, deposit, and bid limit.
