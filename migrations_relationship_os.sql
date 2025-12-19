-- 1. Generated Prompts Table (Next Conversation Suggestions)
create table public.generated_prompts (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  prompt text not null,
  context text, -- Why this prompt? e.g. "Because they mentioned X last time"
  status text check (status in ('new', 'used', 'dismissed')) default 'new',
  created_at timestamptz default now()
);

-- RLS for Prompts
alter table public.generated_prompts enable row level security;

create policy "Users can view prompts for their contacts"
  on public.generated_prompts for select
  using (
    exists (
      select 1 from public.contacts
      where contacts.id = generated_prompts.contact_id
      and contacts.user_id = auth.uid()
    )
  );

create policy "Users can update prompts for their contacts"
  on public.generated_prompts for update
  using (
    exists (
      select 1 from public.contacts
      where contacts.id = generated_prompts.contact_id
      and contacts.user_id = auth.uid()
    )
  );

create policy "Users can insert prompts" -- Typically backend, but user needs permission if logic is client-side or if using service role (which bypasses RLS anyway, but good to have)
  on public.generated_prompts for insert
  with check (
    exists (
      select 1 from public.contacts
      where contacts.id = generated_prompts.contact_id
      and contacts.user_id = auth.uid()
    )
  );

-- 2. Enhanced Interaction Fields (Memory Engine)
alter table public.interactions add column if not exists topics text[] default array[]::text[];
alter table public.interactions add column if not exists sentiment text; -- 'positive', 'neutral', 'concerned'
alter table public.interactions add column if not exists commitments jsonb default '[]'::jsonb; -- Array of { "who": "me"|"them", "what": "send email", "status": "pending" }

-- 3. Relationship Health Scoring
alter table public.contacts add column if not exists health_score int default 50; -- 0-100
alter table public.contacts add column if not exists last_analyzed_at timestamptz;
