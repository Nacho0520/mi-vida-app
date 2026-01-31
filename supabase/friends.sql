-- Friends: Amigos silenciosos (invitaciones y resumen privado)

create extension if not exists pgcrypto;

-- Friendships (solicitudes entre usuarios)
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.user_profiles(user_id) on delete cascade,
  addressee_id uuid not null references public.user_profiles(user_id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz default now(),
  accepted_at timestamptz
);

create unique index if not exists friendships_unique_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.friendships enable row level security;

create policy "Friends read own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Friends create request"
  on public.friendships for insert
  with check (auth.uid() = requester_id and requester_id <> addressee_id);

create policy "Friends accept own request"
  on public.friendships for update
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

create policy "Friends delete own request"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Friend codes (código para añadir amigos)
create table if not exists public.friend_codes (
  user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  code text unique not null,
  created_at timestamptz default now(),
  rotated_at timestamptz
);

alter table public.friend_codes enable row level security;

create policy "Users manage own friend code"
  on public.friend_codes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Email invites (para usuarios que aún no se añadieron)
create table if not exists public.friend_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.user_profiles(user_id) on delete cascade,
  invitee_email text not null,
  status text not null default 'pending',
  created_at timestamptz default now(),
  accepted_at timestamptz
);

alter table public.friend_invites enable row level security;

create policy "Inviter can read own invites"
  on public.friend_invites for select
  using (auth.uid() = inviter_id or (auth.jwt() ->> 'email') = invitee_email);

create policy "Inviter can create invites"
  on public.friend_invites for insert
  with check (auth.uid() = inviter_id);

create policy "Invitee or inviter can update invite"
  on public.friend_invites for update
  using (auth.uid() = inviter_id or (auth.jwt() ->> 'email') = invitee_email)
  with check (auth.uid() = inviter_id or (auth.jwt() ->> 'email') = invitee_email);

create policy "Invitee or inviter can delete invite"
  on public.friend_invites for delete
  using (auth.uid() = inviter_id or (auth.jwt() ->> 'email') = invitee_email);

-- Buscar usuario por email (solo match exacto)
create or replace function public.search_user_by_email(p_email text)
returns table (
  user_id uuid,
  email text
)
language sql
security definer
as $$
  select user_id, email
  from public.user_profiles
  where lower(email) = lower(p_email)
    and user_id <> auth.uid()
  limit 1;
$$;

-- Crear/rotar código de amigo
create or replace function public.create_friend_code()
returns text
language plpgsql
security definer
as $$
declare
  v_code text;
  v_exists int;
begin
  loop
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
    select count(*) into v_exists from public.friend_codes where code = v_code;
    exit when v_exists = 0;
  end loop;

  insert into public.friend_codes (user_id, code, created_at, rotated_at)
  values (auth.uid(), v_code, now(), now())
  on conflict (user_id) do update set code = excluded.code, rotated_at = now();

  return v_code;
end;
$$;

-- Aceptar código de amigo (crea vínculo aceptado)
create or replace function public.accept_friend_code(p_code text)
returns void
language plpgsql
security definer
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.friend_codes where code = p_code;
  if v_owner is null or v_owner = auth.uid() then
    return;
  end if;

  insert into public.friendships (requester_id, addressee_id, status, created_at, accepted_at)
  values (auth.uid(), v_owner, 'accepted', now(), now())
  on conflict do nothing;
end;
$$;

-- Crear solicitud por usuario
create or replace function public.create_friend_request(p_friend_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if p_friend_id is null or p_friend_id = auth.uid() then
    return;
  end if;
  insert into public.friendships (requester_id, addressee_id, status, created_at)
  values (auth.uid(), p_friend_id, 'pending', now())
  on conflict do nothing;
end;
$$;

-- Responder solicitud (aceptar o rechazar)
create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
as $$
begin
  if p_accept then
    update public.friendships
      set status = 'accepted', accepted_at = now()
      where id = p_request_id and addressee_id = auth.uid();
  else
    delete from public.friendships where id = p_request_id and addressee_id = auth.uid();
  end if;
end;
$$;

-- Crear invitación por email
create or replace function public.create_friend_invite(p_email text)
returns void
language plpgsql
security definer
as $$
begin
  if p_email is null or lower(p_email) = lower(auth.jwt() ->> 'email') then
    return;
  end if;

  insert into public.friend_invites (inviter_id, invitee_email, status, created_at)
  values (auth.uid(), p_email, 'pending', now());
end;
$$;

-- Aceptar invitación por email
create or replace function public.accept_friend_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_inviter uuid;
  v_email text;
begin
  select inviter_id, invitee_email into v_inviter, v_email
    from public.friend_invites where id = p_invite_id;

  if v_inviter is null or lower(v_email) <> lower(auth.jwt() ->> 'email') then
    return;
  end if;

  update public.friend_invites
    set status = 'accepted', accepted_at = now()
    where id = p_invite_id;

  insert into public.friendships (requester_id, addressee_id, status, created_at, accepted_at)
  values (v_inviter, auth.uid(), 'accepted', now(), now())
  on conflict do nothing;
end;
$$;

-- Resumen de amigos (racha + consistencia semanal)
create or replace function public.get_friend_summary()
returns table (
  friend_id uuid,
  email text,
  streak integer,
  weekly_consistency numeric
)
language plpgsql
security definer
as $$
begin
  return query
  with friends as (
    select
      case when requester_id = auth.uid() then addressee_id else requester_id end as friend_id
    from public.friendships
    where status = 'accepted'
      and (requester_id = auth.uid() or addressee_id = auth.uid())
  ),
  friend_emails as (
    select f.friend_id, p.email
    from friends f
    join public.user_profiles p on p.user_id = f.friend_id
  ),
  habits_count as (
    select user_id, count(*)::numeric as total_habits
    from public.habits
    group by user_id
  ),
  completed_last_7 as (
    select user_id, count(*)::numeric as total_completed
    from public.daily_logs
    where status = 'completed' and created_at >= now() - interval '7 days'
    group by user_id
  ),
  active_days as (
    select user_id, (date_trunc('day', created_at))::date as day
    from public.daily_logs
    where status = 'completed'
    group by user_id, (date_trunc('day', created_at))::date
  ),
  streaks as (
    select f.friend_id,
      (
        with start_day as (
          select
            case
              when exists(select 1 from active_days a where a.user_id = f.friend_id and a.day = current_date) then current_date
              when exists(select 1 from active_days a where a.user_id = f.friend_id and a.day = current_date - 1) then current_date - 1
              else null
            end as day
        ),
        seq as (
          select generate_series(0, 365) as offset
        ),
        checks as (
          select offset, (start_day.day - offset) as day,
            exists(select 1 from active_days a where a.user_id = f.friend_id and a.day = (start_day.day - offset)) as active
          from seq, start_day
          where start_day.day is not null
        ),
        first_gap as (
          select min(offset) as gap from checks where active = false
        )
        select
          case
            when (select day from start_day) is null then 0
            when (select gap from first_gap) is null then (select count(*) from checks)
            else (select gap from first_gap)
          end
      ) as streak
    from friends f
  )
  select
    e.friend_id,
    e.email,
    coalesce(s.streak, 0)::integer as streak,
    case
      when coalesce(h.total_habits, 0) = 0 then 0
      else round(coalesce(c.total_completed, 0) / (h.total_habits * 7) * 100, 1)
    end as weekly_consistency
  from friend_emails e
  left join streaks s on s.friend_id = e.friend_id
  left join habits_count h on h.user_id = e.friend_id
  left join completed_last_7 c on c.user_id = e.friend_id
  order by weekly_consistency desc nulls last;
end;
$$;
