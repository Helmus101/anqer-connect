-- Add Relationship Summary and Last Analyzed columns
alter table public.contacts add column if not exists relationship_summary text;
alter table public.contacts add column if not exists last_analyzed timestamptz;

-- Update search network function to include relationship_summary
drop function if exists public.search_network(text);

create or replace function public.search_network(search_query text)
returns table (
    contact_id uuid,
    contact_name text,
    contact_job text,
    contact_location text,
    contact_bio text,
    contact_ai_summary text,
    contact_interests jsonb,
    contact_tags jsonb,
    contact_social_links jsonb,
    contact_relationship_summary text, -- NEW
    owner_email text,
    is_own_contact boolean
)
language plpgsql
security definer
as $$
begin
    return query
    -- 1. My Contacts
    select 
        c.id as contact_id,
        c.name as contact_name,
        c.job as contact_job,
        c.location as contact_location,
        c.bio as contact_bio,
        c.ai_summary as contact_ai_summary,
        c.interests as contact_interests,
        c.tags as contact_tags,
        c.social_links as contact_social_links,
        c.relationship_summary as contact_relationship_summary,
        u.email as owner_email,
        true as is_own_contact
    from public.contacts c
    join auth.users u on c.user_id = u.id
    where c.user_id = auth.uid()
    and (c.name ilike '%' || search_query || '%' or c.job ilike '%' || search_query || '%' or c.tags::text ilike '%' || search_query || '%')
    
    union all
    
    -- 2. Friends' Contacts
    select 
        c.id as contact_id,
        c.name as contact_name,
        c.job as contact_job,
        c.location as contact_location,
        c.bio as contact_bio,
        c.ai_summary as contact_ai_summary,
        c.interests as contact_interests,
        c.tags as contact_tags,
        c.social_links as contact_social_links,
        c.relationship_summary as contact_relationship_summary,
        u.email as owner_email,
        false as is_own_contact
    from public.contacts c
    join auth.users u on c.user_id = u.id
    where c.user_id in (select friend_id from public.friendships where user_id = auth.uid())
    and (c.name ilike '%' || search_query || '%' or c.job ilike '%' || search_query || '%' or c.tags::text ilike '%' || search_query || '%');
end;
$$;
