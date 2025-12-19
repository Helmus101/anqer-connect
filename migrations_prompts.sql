
-- Create generated_prompts table if it doesn't exist
create table if not exists public.generated_prompts (
    id uuid default gen_random_uuid() primary key,
    contact_id uuid references public.contacts(id) on delete cascade not null,
    prompt text not null,
    context text,
    status text default 'new' check (status in ('new', 'used', 'dismissed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies for generated_prompts
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

create policy "Users can insert prompts for their contacts"
    on public.generated_prompts for insert
    with check (
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
