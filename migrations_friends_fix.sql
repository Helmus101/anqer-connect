-- RPC to get pending requests with emails (Safe Join)
create or replace function public.get_pending_requests()
returns table (
  id uuid,
  sender_id uuid,
  sender_email text,
  receiver_id uuid,
  receiver_email text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    fr.id,
    fr.sender_id,
    u_sender.email::text as sender_email,
    fr.receiver_id,
    u_receiver.email::text as receiver_email,
    fr.status,
    fr.created_at
  from public.friend_requests fr
  join auth.users u_sender on fr.sender_id = u_sender.id
  join auth.users u_receiver on fr.receiver_id = u_receiver.id
  where (fr.sender_id = auth.uid() or fr.receiver_id = auth.uid())
  and fr.status = 'pending'
  order by fr.created_at desc;
end;
$$;

-- RPC to get confirmed friends with emails (Safe Join)
create or replace function public.get_my_friends()
returns table (
  friend_id uuid,
  friend_email text
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    f.friend_id,
    u.email::text as friend_email
  from public.friendships f
  join auth.users u on f.friend_id = u.id
  where f.user_id = auth.uid();
end;
$$;
