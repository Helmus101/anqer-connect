-- Create contacts table
create table public.contacts (
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

-- Create interactions table
create table public.interactions (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  type text not null,
  date timestamptz default now(),
  notes text,
  platform text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.contacts enable row level security;
alter table public.interactions enable row level security;

-- Create policies for contacts
create policy "Users can view their own contacts"
  on public.contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own contacts"
  on public.contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own contacts"
  on public.contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own contacts"
  on public.contacts for delete
  using (auth.uid() = user_id);

-- Create policies for interactions
create policy "Users can view interactions for their contacts"
  on public.interactions for select
  using (
    exists (
      select 1 from public.contacts
      where contacts.id = interactions.contact_id
      and contacts.user_id = auth.uid()
    )
  );

create policy "Users can insert interactions for their contacts"
  on public.interactions for insert
  with check (
    exists (
      select 1 from public.contacts
      where contacts.id = interactions.contact_id
      and contacts.user_id = auth.uid()
    )
  );

-- 4. Friendships Table & Network Sharing
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  friend_id uuid references auth.users not null,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, friend_id)
);

-- RLS for Friendships
alter table public.friendships enable row level security;

-- Users can see their own friendships
create policy "Users can view their own friendships"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Users can create friendship requests
create policy "Users can insert friendships"
  on public.friendships for insert
  with check (auth.uid() = user_id);

-- Users can update status (accept)
create policy "Users can update friendships"
  on public.friendships for update
  using (auth.uid() = friend_id or auth.uid() = user_id);

-- 5. Network Access Policy (The "Secret Sauce")
-- Allow users to view CONTACTS if they are friends with the contact owner
create policy "Friends can view shared contacts"
  on public.contacts for select
  using (
    exists (
      select 1 from public.friendships
      where (user_id = public.contacts.user_id and friend_id = auth.uid() and status = 'accepted')
         or (friend_id = public.contacts.user_id and user_id = auth.uid() and status = 'accepted')
    )
  );

-- 6. Rich Profile Fields (Deep Sync)
-- Run this if you already have the table, or I will update the CREATE definition above next time.
alter table public.contacts add column if not exists social_links jsonb default '[]'::jsonb;
alter table public.contacts add column if not exists address text;
alter table public.contacts add column if not exists birthday text;
alter table public.contacts add column if not exists ai_summary text;
