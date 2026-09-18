-- GAMING PASAL REFERRAL SYSTEM
-- Run this entire file in Supabase SQL Editor.
-- This version tracks referral relationships and discount eligibility.
-- Actual order/payment verification should be performed by your trusted admin/order backend.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  referral_code text unique not null,
  referred_by_code text,
  friend_discount_available boolean not null default true,
  referrer_discount_available boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid unique not null references public.profiles(id) on delete cascade,
  referral_code text not null,
  status text not null default 'pending' check (status in ('pending','completed','invalid')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create or replace function public.make_referral_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_ref text;
  v_referrer uuid;
begin
  v_code := upper('GP' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_ref := upper(coalesce(new.raw_user_meta_data->>'referral_code_input',''));

  if v_ref <> '' then
    select id into v_referrer from public.profiles where referral_code = v_ref limit 1;
    if v_referrer = new.id then v_referrer := null; end if;
  end if;

  insert into public.profiles(id,name,referral_code,referred_by_code)
  values(new.id,new.raw_user_meta_data->>'name',v_code,case when v_referrer is not null then v_ref else null end);

  if v_referrer is not null then
    insert into public.referrals(referrer_id,referred_user_id,referral_code)
    values(v_referrer,new.id,v_ref)
    on conflict (referred_user_id) do nothing;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created_referral on auth.users;
create trigger on_auth_user_created_referral
after insert on auth.users
for each row execute function public.make_referral_profile();

alter table public.profiles enable row level security;
alter table public.referrals enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own" on public.referrals
for select to authenticated using (referrer_id = auth.uid());

-- The following secure function is for your admin/order process.
-- Call it only after confirming the referred customer's qualifying order.
create or replace function public.complete_referral(p_referred_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r public.referrals;
begin
  select * into r from public.referrals
  where referred_user_id = p_referred_user and status = 'pending'
  for update;

  if not found then raise exception 'No pending referral found'; end if;

  update public.referrals
  set status='completed', completed_at=now()
  where id=r.id;

  update public.profiles
  set friend_discount_available=false
  where id=r.referred_user_id;

  update public.profiles
  set referrer_discount_available=true
  where id=r.referrer_id;
end $$;

-- IMPORTANT:
-- Do not expose a service-role key in GitHub.
-- If you use this function from a server/Edge Function, protect it with
-- your own admin authorization. Do not make complete_referral callable by
-- ordinary customers.
