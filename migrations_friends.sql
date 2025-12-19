-- 1. Friend Requests Table
create table if not exists public.friend_requests (
    id uuid default gen_random_uuid() primary key,
    sender_id uuid references auth.users(id) not null,
    receiver_id uuid references auth.users(id) not null,
    status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(sender_id, receiver_id)
);

-- RLS for Friend Requests
alter table public.friend_requests enable row level security;

drop policy if exists "Users can view requests they sent or received" on public.friend_requests;
create policy "Users can view requests they sent or received"
    on public.friend_requests for select
    using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can insert requests" on public.friend_requests;
create policy "Users can insert requests"
    on public.friend_requests for insert
    with check (auth.uid() = sender_id);

drop policy if exists "Users can update requests they are receiver of (accept/reject)" on public.friend_requests;
create policy "Users can update requests they are receiver of (accept/reject)"
    on public.friend_requests for update
    using (auth.uid() = receiver_id or auth.uid() = sender_id);

-- 2. Friendships Table (Bidirectional)
create table if not exists public.friendships (
    user_id uuid references auth.users(id) not null,
    friend_id uuid references auth.users(id) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (user_id, friend_id)
);

-- RLS for Friendships
alter table public.friendships enable row level security;

drop policy if exists "Users can view their own friendships" on public.friendships;
create policy "Users can view their own friendships"
    on public.friendships for select
    using (auth.uid() = user_id);

-- 3. Function to Send Friend Request by Email
create or replace function public.send_friend_request(target_email text)
returns json
language plpgsql
security definer
as $$
declare
    target_user_id uuid;
    req_exists boolean;
begin
    -- Find user by email
    select id into target_user_id from auth.users where email = target_email limit 1;
    
    if target_user_id is null then
        return json_build_object('success', false, 'message', 'User not found');
    end if;

    if target_user_id = auth.uid() then
        return json_build_object('success', false, 'message', 'Cannot add yourself');
    end if;

    -- Check if friendship already exists
    if exists (select 1 from public.friendships where user_id = auth.uid() and friend_id = target_user_id) then
        return json_build_object('success', false, 'message', 'Already friends');
    end if;

    -- Check if request already exists
    if exists (select 1 from public.friend_requests where sender_id = auth.uid() and receiver_id = target_user_id and status = 'pending') then
        return json_build_object('success', false, 'message', 'Request already sent');
    end if;
    
    -- Insert request
    insert into public.friend_requests (sender_id, receiver_id, status)
    values (auth.uid(), target_user_id, 'pending');
    
    return json_build_object('success', true, 'message', 'Request sent');
end;
$$;

-- 4. Function to Accept Friend Request
create or replace function public.accept_friend_request(request_id uuid)
returns json
language plpgsql
security definer
as $$
declare
    req_record record;
begin
    -- Get request
    select * into req_record from public.friend_requests where id = request_id;
    
    if req_record is null then
        return json_build_object('success', false, 'message', 'Request not found');
    end if;
    
    if req_record.receiver_id != auth.uid() then
        return json_build_object('success', false, 'message', 'Not authorized');
    end if;
    
    if req_record.status != 'pending' then
        return json_build_object('success', false, 'message', 'Request already processed');
    end if;
    
    -- Update Status
    update public.friend_requests set status = 'accepted' where id = request_id;
    
    -- Insert Bidirectional Friendship (If not exists, though pair constraint handles mainly 1 dir usually, manual bidir insert here)
    -- We assume table friendshps has unique(user_id, friend_id).
    -- We use ON CONFLICT DO NOTHING to be safe.
    insert into public.friendships (user_id, friend_id) values (req_record.sender_id, req_record.receiver_id) on conflict do nothing;
    insert into public.friendships (user_id, friend_id) values (req_record.receiver_id, req_record.sender_id) on conflict do nothing;
    
    return json_build_object('success', true, 'message', 'Friendship accepted');
end;
$$;

-- 5. Global Network Search (My Contacts + Friends' Contacts)
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
        u.email as owner_email,
        false as is_own_contact
    from public.contacts c
    join auth.users u on c.user_id = u.id
    where c.user_id in (select friend_id from public.friendships where user_id = auth.uid())
    and (c.name ilike '%' || search_query || '%' or c.job ilike '%' || search_query || '%' or c.tags::text ilike '%' || search_query || '%');
end;
$$;
