-- Additive personal-information fields for existing Telegram accounts.
alter table public.auction_users add column if not exists residential_country text;
alter table public.auction_users add column if not exists residential_city text;
alter table public.auction_users add column if not exists residential_region text;
alter table public.auction_users add column if not exists residential_address text;
alter table public.auction_users add column if not exists postal_code text;
alter table public.auction_users add column if not exists mailing_address text;
alter table public.auction_users add column if not exists mailing_same_as_residential boolean not null default false;
