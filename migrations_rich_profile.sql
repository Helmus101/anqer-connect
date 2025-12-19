-- Run this to update your existing contacts table with new fields
-- Can be run multiple times safely.

alter table public.contacts add column if not exists social_links jsonb default '[]'::jsonb;
alter table public.contacts add column if not exists address text;
alter table public.contacts add column if not exists birthday text;
alter table public.contacts add column if not exists ai_summary text;
