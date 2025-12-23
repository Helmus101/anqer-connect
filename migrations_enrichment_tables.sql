-- Enrichment System Tables
-- Run this in Supabase SQL Editor

-- 1. Anchors table
create table if not exists public.anchors (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  type text not null check (type in ('email', 'company', 'location', 'social_url')),
  value text not null,
  confidence numeric default 1.0,
  created_at timestamptz default now(),
  unique(contact_id, type, value)
);

-- 2. CandidateProfiles table
create table if not exists public.candidate_profiles (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  source_url text not null,
  name text,
  company text,
  role text,
  location text,
  timeline jsonb default '[]'::jsonb,
  bio text,
  raw_data jsonb default '{}'::jsonb,
  confidence_score numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. ProfileHypotheses table
create table if not exists public.profile_hypotheses (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  accepted_candidate_id uuid references public.candidate_profiles(id) on delete set null,
  confidence_level text not null check (confidence_level in ('high', 'medium', 'low')),
  confirmed_by_user boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(contact_id) -- Only one hypothesis per contact
);

-- 4. Enable RLS
alter table public.anchors enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.profile_hypotheses enable row level security;

-- 5. RLS Policies for Anchors
drop policy if exists "Users can view anchors for their contacts" on public.anchors;
create policy "Users can view anchors for their contacts" on public.anchors
  for select using (
    exists (
      select 1 from public.contacts
      where contacts.id = anchors.contact_id
      and contacts.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert anchors for their contacts" on public.anchors;
create policy "Users can insert anchors for their contacts" on public.anchors
  for insert with check (
    exists (
      select 1 from public.contacts
      where contacts.id = anchors.contact_id
      and contacts.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update anchors for their contacts" on public.anchors;
create policy "Users can update anchors for their contacts" on public.anchors
  for update using (
    exists (
      select 1 from public.contacts
      where contacts.id = anchors.contact_id
      and contacts.user_id = auth.uid()
    )
  );

-- 6. RLS Policies for CandidateProfiles
drop policy if exists "Users can view candidate profiles for their contacts" on public.candidate_profiles;
create policy "Users can view candidate profiles for their contacts" on public.candidate_profiles
  for select using (
    exists (
      select 1 from public.contacts
      where contacts.id = candidate_profiles.contact_id
      and contacts.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert candidate profiles for their contacts" on public.candidate_profiles;
create policy "Users can insert candidate profiles for their contacts" on public.candidate_profiles
  for insert with check (
    exists (
      select 1 from public.contacts
      where contacts.id = candidate_profiles.contact_id
      and contacts.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update candidate profiles for their contacts" on public.candidate_profiles;
create policy "Users can update candidate profiles for their contacts" on public.candidate_profiles
  for update using (
    exists (
      select 1 from public.contacts
      where contacts.id = candidate_profiles.contact_id
      and contacts.user_id = auth.uid()
    )
  );

-- 7. RLS Policies for ProfileHypotheses
drop policy if exists "Users can view profile hypotheses for their contacts" on public.profile_hypotheses;
create policy "Users can view profile hypotheses for their contacts" on public.profile_hypotheses
  for select using (
    exists (
      select 1 from public.contacts
      where contacts.id = profile_hypotheses.contact_id
      and contacts.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert profile hypotheses for their contacts" on public.profile_hypotheses;
create policy "Users can insert profile hypotheses for their contacts" on public.profile_hypotheses
  for insert with check (
    exists (
      select 1 from public.contacts
      where contacts.id = profile_hypotheses.contact_id
      and contacts.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update profile hypotheses for their contacts" on public.profile_hypotheses;
create policy "Users can update profile hypotheses for their contacts" on public.profile_hypotheses
  for update using (
    exists (
      select 1 from public.contacts
      where contacts.id = profile_hypotheses.contact_id
      and contacts.user_id = auth.uid()
    )
  );

-- 8. Indexes for performance
create index if not exists idx_anchors_contact_id on public.anchors(contact_id);
create index if not exists idx_candidate_profiles_contact_id on public.candidate_profiles(contact_id);
create index if not exists idx_profile_hypotheses_contact_id on public.profile_hypotheses(contact_id);
create index if not exists idx_profile_hypotheses_candidate_id on public.profile_hypotheses(accepted_candidate_id);

