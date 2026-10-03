-- Add optional profile details without changing existing balances, roles or identities.
alter table public.auction_users add column if not exists email text;
alter table public.auction_users add column if not exists phone text;
alter table public.auction_users add column if not exists phone_country text;
alter table public.auction_users add column if not exists avatar_url text;
alter table public.auction_users add column if not exists country text;
alter table public.auction_users add column if not exists language text not null default 'ru';
alter table public.auction_users drop constraint if exists auction_users_language_check;
alter table public.auction_users add constraint auction_users_language_check check (language in ('ru','en','ar'));
