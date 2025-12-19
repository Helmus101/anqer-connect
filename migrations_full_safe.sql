-- COMPLETE SAFE MIGRATION SCRIPT
-- Run this in Supabase SQL Editor. It will safely skip tables that exist and only add what's missing.

-- 1. Contacts
create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text,
  email text,
  how_met text,
  relationship_strength text check (relationship_strength in ('close', 'medium', 'weak', 'drifting')) default 'medium',
  last_contacted timestamptz default now(),
  last_contact_type text default 'in_person',
  location text,
  job text,
  tags text[] default array[]::text[],
  interests jsonb default '[]'::jsonb,
  avatar text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Interactions
create table if not exists public.interactions (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  type text not null,
  date timestamptz default now(),
  notes text,
  platform text,
  created_at timestamptz default now()
);

-- 3. Friendships
create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  friend_id uuid references auth.users not null,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, friend_id)
);

-- 4. Enable RLS (Safe)
alter table public.contacts enable row level security;
alter table public.interactions enable row level security;
alter table public.friendships enable row level security;

-- 5. Add Rich Columns (If missing)
alter table public.contacts add column if not exists social_links jsonb default '[]'::jsonb;
alter table public.contacts add column if not exists address text;
alter table public.contacts add column if not exists birthday text;
alter table public.contacts add column if not exists ai_summary text;

-- 6. Policies (Drop & Recreate to ensure they are up to date)
-- Contacts
drop policy if exists "Users can view their own contacts" on public.contacts;
create policy "Users can view their own contacts" on public.contacts for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own contacts" on public.contacts;
create policy "Users can insert their own contacts" on public.contacts for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own contacts" on public.contacts;
create policy "Users can update their own contacts" on public.contacts for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own contacts" on public.contacts;
create policy "Users can delete their own contacts" on public.contacts for delete using (auth.uid() = user_id);

-- Interactions
drop policy if exists "Users can view interactions for their contacts" on public.interactions;
create policy "Users can view interactions for their contacts" on public.interactions for select using (exists (select 1 from public.contacts where contacts.id = interactions.contact_id and contacts.user_id = auth.uid()));

drop policy if exists "Users can insert interactions for their contacts" on public.interactions;
create policy "Users can insert interactions for their contacts" on public.interactions for insert with check (exists (select 1 from public.contacts where contacts.id = interactions.contact_id and contacts.user_id = auth.uid()));

-- Friendships
drop policy if exists "Users can view their own friendships" on public.friendships;
create policy "Users can view their own friendships" on public.friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "Users can insert friendships" on public.friendships;
create policy "Users can insert friendships" on public.friendships for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update friendships" on public.friendships;
create policy "Users can update friendships" on public.friendships for update using (auth.uid() = friend_id or auth.uid() = user_id);

-- Shared Access
drop policy if exists "Friends can view shared contacts" on public.contacts;
create policy "Friends can view shared contacts" on public.contacts for select using (exists (select 1 from public.friendships where (user_id = public.contacts.user_id and friend_id = auth.uid() and status = 'accepted') or (friend_id = public.contacts.user_id and user_id = auth.uid() and status = 'accepted')));
