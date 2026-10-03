-- Glimpse database schema: a shared, anonymous archive of the everyday city.
-- Paste this whole file into Supabase → SQL Editor → New query → Run (on a fresh project).
-- Also enable: Authentication → Sign In / Providers → "Allow anonymous sign-ins".
--
-- Three principles shape the data:
--   1. Place over person: no names anywhere. Public views never expose who took a glimpse,
--      who kept it, or who wrote a note. Accounts exist only so people can delete their own
--      things, and so you (the operator) can ban abuse — Apple guideline 1.2.
--   2. Record over performance: no likes, no follower counts. Keeping is private.
--   3. Time is a dimension: every glimpse carries its place, its local time and a catalogue number.

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id                uuid primary key references auth.users on delete cascade,
  handle            text not null unique,                   -- private, auto-generated, never shown to others
  accepted_terms_at timestamptz,                            -- must be set before adding anything
  banned            boolean not null default false,         -- set by you in the Table Editor
  created_at        timestamptz not null default now()
);

create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  catalog_no  bigserial unique,                             -- "No. 38,201", assigned on arrival
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  image_path  text not null,                                -- path inside the "photos" storage bucket
  width       int,
  height      int,
  caption     text check (char_length(caption) <= 280),
  place_name  text check (char_length(place_name) <= 120),  -- "Alfama, Lisbon"
  place_key   text check (place_key ~ '^[a-z0-9-]{1,120}$'),-- "alfama-lisbon": glimpses with the same key are layers
  city        text check (char_length(city) <= 60),
  latitude    double precision,                             -- already rounded on the phone unless "exact"
  longitude   double precision,
  taken_at    timestamptz,
  local_time  text check (local_time ~ '^\d{2}:\d{2}$'),    -- clock time where it was taken, for the Now view
  local_hour  smallint generated always as (substr(local_time, 1, 2)::smallint) stored,
  camera      text check (char_length(camera) <= 100),
  word        text check (char_length(word) between 1 and 24), -- the photographer's word for the city
  prompt_key  text check (prompt_key ~ '^\d{4}-\d{2}-\d{2}$'),  -- daily observation
  hidden      boolean not null default false,               -- set automatically after enough reports
  created_at  timestamptz not null default now(),
  -- Who can see it. 'archive' = everyone. 'private' = only the person who took it, on their own
  -- map (it didn't pass the phone's photo checks, or they kept it to themselves).
  visibility  text not null default 'archive' check (visibility in ('private', 'archive')),
  quality     jsonb,                                        -- what the phone's photo checks measured
  image_hash  text check (image_hash ~ '^[0-9a-f]{16}$'),  -- 64-bit difference hash, to spot duplicates
  featured_at timestamptz                                   -- picked for the home feed; set only via feature_photo()
);
create index if not exists photos_created_at_idx on public.photos (created_at desc);
create index if not exists photos_place_idx  on public.photos (place_key, taken_at) where place_key is not null;
create index if not exists photos_city_idx   on public.photos (city, created_at desc) where city is not null;
create index if not exists photos_hour_idx   on public.photos (local_hour, created_at desc);
create index if not exists photos_prompt_idx on public.photos (prompt_key, created_at desc) where prompt_key is not null;
create index if not exists photos_location_idx on public.photos (latitude, longitude) where latitude is not null;

-- Anonymous notes about the place a glimpse shows.
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid not null references public.photos on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  body       text not null check (char_length(body) between 1 and 300),
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notes_photo_idx on public.notes (photo_id, created_at);

-- Keep: private collecting, optionally with your word for the city. Never counted publicly per photo.
create table if not exists public.keeps (
  photo_id   uuid not null references public.photos on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  word       text check (char_length(word) between 1 and 24),
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

-- "I've been here": a quiet, private witness.
create table if not exists public.been_here (
  photo_id   uuid not null references public.photos on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

-- Follow a place (never a person).
create table if not exists public.place_follows (
  place_key  text not null,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (place_key, user_id)
);

create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid references public.photos on delete cascade,
  note_id    uuid references public.notes on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  reason     text check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  check (num_nonnulls(photo_id, note_id) = 1)
);
create unique index if not exists reports_photo_once on public.reports (photo_id, user_id) where photo_id is not null;
create unique index if not exists reports_note_once  on public.reports (note_id, user_id)  where note_id is not null;

create table if not exists public.blocks (
  blocker_id uuid not null references auth.users on delete cascade,
  blocked_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- Who has seen a glimpse in their feed (once per person). Never shown in the app: it decides when a
-- new glimpse leaves the "fresh" trial slot, and is the denominator of the keep rate (photo_scores).
create table if not exists public.photo_views (
  photo_id   uuid not null references public.photos on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

-- People who can pick glimpses for everyone's home feed. Add yourself in Table Editor → editors
-- (your user id is in Authentication → Users once you've opened the app).
create table if not exists public.editors (
  user_id    uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

-- Existing projects: add the newer photo columns if this schema was run before they existed.
alter table public.photos add column if not exists visibility  text not null default 'archive' check (visibility in ('private', 'archive'));
alter table public.photos add column if not exists quality     jsonb;
alter table public.photos add column if not exists image_hash  text check (image_hash ~ '^[0-9a-f]{16}$');
alter table public.photos add column if not exists featured_at timestamptz;
create index if not exists photos_featured_idx on public.photos (featured_at desc) where featured_at is not null;
create index if not exists photos_hash_idx on public.photos (image_hash) where image_hash is not null;

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────

-- True when the signed-in user has accepted the rules and isn't banned.
create or replace function public.can_post()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and accepted_terms_at is not null and not banned
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: users can only touch their own rows directly.
-- Everyone reads the archive through the views below instead.
-- ─────────────────────────────────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.photos        enable row level security;
alter table public.notes         enable row level security;
alter table public.keeps         enable row level security;
alter table public.been_here     enable row level security;
alter table public.place_follows enable row level security;
alter table public.reports       enable row level security;
alter table public.blocks        enable row level security;
alter table public.photo_views   enable row level security; -- no policies: written only by record_views()
alter table public.editors       enable row level security;

create policy "own profile: read"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile: create" on public.profiles for insert to authenticated with check (id = auth.uid() and not banned);
create policy "own profile: update" on public.profiles for update to authenticated
  using (id = auth.uid() and not banned) with check (id = auth.uid() and not banned);

create policy "own photos: read"   on public.photos for select to authenticated using (user_id = auth.uid());
-- Nobody can feature their own upload: featured_at is only ever set through feature_photo().
create policy "own photos: create" on public.photos for insert to authenticated
  with check (user_id = auth.uid() and public.can_post() and featured_at is null);
create policy "own photos: delete" on public.photos for delete to authenticated using (user_id = auth.uid());

create policy "own notes: read"   on public.notes for select to authenticated using (user_id = auth.uid());
create policy "own notes: create" on public.notes for insert to authenticated with check (user_id = auth.uid() and public.can_post());
create policy "own notes: delete" on public.notes for delete to authenticated using (user_id = auth.uid());

create policy "own keeps: read"   on public.keeps for select to authenticated using (user_id = auth.uid());
create policy "own keeps: create" on public.keeps for insert to authenticated with check (user_id = auth.uid());
create policy "own keeps: update" on public.keeps for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own keeps: delete" on public.keeps for delete to authenticated using (user_id = auth.uid());

create policy "own been_here: read"   on public.been_here for select to authenticated using (user_id = auth.uid());
create policy "own been_here: create" on public.been_here for insert to authenticated with check (user_id = auth.uid());
create policy "own been_here: delete" on public.been_here for delete to authenticated using (user_id = auth.uid());

create policy "own follows: read"   on public.place_follows for select to authenticated using (user_id = auth.uid());
create policy "own follows: create" on public.place_follows for insert to authenticated with check (user_id = auth.uid());
create policy "own follows: delete" on public.place_follows for delete to authenticated using (user_id = auth.uid());

create policy "own reports: create" on public.reports for insert to authenticated with check (user_id = auth.uid());
create policy "own blocks: read"    on public.blocks  for select to authenticated using (blocker_id = auth.uid());
create policy "own editor row: read" on public.editors for select to authenticated using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Public views. They run with the owner's rights (on purpose) so they can show every
-- glimpse while never exposing user_id. Per-viewer columns (is_mine, kept_by_me…) only
-- describe the person asking. Content from banned or blocked accounts is left out.
-- ─────────────────────────────────────────────────────────────

create or replace view public.archive_photos as
select
  p.id, p.catalog_no, p.image_path, p.width, p.height, p.caption,
  p.place_name, p.place_key, p.city, p.latitude, p.longitude,
  p.taken_at, p.local_time, p.local_hour, p.camera, p.created_at, p.word, p.prompt_key,
  (select count(*) from public.notes n where n.photo_id = p.id and not n.hidden)::int as note_count,
  (p.user_id = auth.uid()) as is_mine,
  exists (select 1 from public.keeps k where k.photo_id = p.id and k.user_id = auth.uid()) as kept_by_me,
  exists (select 1 from public.been_here b where b.photo_id = p.id and b.user_id = auth.uid()) as been_here_by_me,
  p.visibility,
  (p.featured_at is not null) as featured,
  p.featured_at
from public.photos p
left join public.profiles pr on pr.id = p.user_id
where not p.hidden
  -- The shared archive, plus your own private glimpses (which only you ever see).
  and (p.visibility = 'archive' or p.user_id = auth.uid())
  and not coalesce(pr.banned, false)
  and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.user_id);

-- The home feed's trial slot: shared glimpses from the last 30 days that aren't Featured, aren't
-- yours, and that fewer than 50 people have seen. Each gets a chance in front of real people;
-- the ones they keep rise in photo_scores.
create or replace view public.fresh_photos as
select a.*
from public.archive_photos a
where a.visibility = 'archive'
  and not a.featured
  and not a.is_mine
  and a.created_at > now() - interval '30 days'
  and (select count(*) from public.photo_views v where v.photo_id = a.id) < 50;

create or replace view public.archive_notes as
select n.id, n.photo_id, n.body, n.created_at, (n.user_id = auth.uid()) as is_mine
from public.notes n
join public.photos p on p.id = n.photo_id and not p.hidden and (p.visibility = 'archive' or p.user_id = auth.uid())
left join public.profiles pr on pr.id = n.user_id
where not n.hidden
  and not coalesce(pr.banned, false)
  and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = n.user_id);

-- How everyone defines each city: the words attached when capturing or keeping.
create or replace view public.city_words as
select city, word, count(*)::int as count
from (
  select p.city, lower(trim(p.word)) as word from public.photos p
  where p.city is not null and p.word is not null and not p.hidden and p.visibility = 'archive'
  union all
  select p.city, lower(trim(k.word)) from public.keeps k join public.photos p on p.id = k.photo_id
  where p.city is not null and k.word is not null and not p.hidden and p.visibility = 'archive'
) w
group by city, word;

-- Every count below is made only of the shared archive (never private glimpses), so the numbers
-- the app shows are exactly what people have actually shared.

create or replace view public.city_stats as
select
  p.city,
  count(*)::int as glimpse_count,
  count(distinct p.place_key)::int as place_count,
  -- people who took or kept a glimpse here (a number, never who)
  (select count(distinct u) from (
     select p2.user_id as u from public.photos p2 where p2.city = p.city and not p2.hidden and p2.visibility = 'archive'
     union
     select k.user_id from public.keeps k join public.photos p3 on p3.id = k.photo_id
     where p3.city = p.city and not p3.hidden and p3.visibility = 'archive'
   ) d)::int as definer_count
from public.photos p
where p.city is not null and not p.hidden and p.visibility = 'archive'
group by p.city;

create or replace view public.places as
select
  p.place_key,
  (array_agg(p.place_name order by p.created_at desc))[1] as name,
  (array_agg(p.city order by p.created_at desc))[1] as city,
  avg(p.latitude) as latitude,
  avg(p.longitude) as longitude,
  count(*)::int as count,
  min(coalesce(p.taken_at, p.created_at)) as first_at,
  max(coalesce(p.taken_at, p.created_at)) as last_at,
  (array_agg(p.image_path order by p.created_at desc))[1] as cover_path,
  exists (select 1 from public.place_follows f where f.place_key = p.place_key and f.user_id = auth.uid()) as followed_by_me
from public.photos p
where p.place_key is not null and not p.hidden and p.visibility = 'archive'
group by p.place_key;

-- The headline number ("2,481 photos people took but never posted"): real shared glimpses only.
-- The app hides the number until it reaches 1,000 (ARCHIVE_COUNT_MIN in src/lib/config.ts).
create or replace view public.archive_stats as
select
  (select count(*) from public.photos where not hidden and visibility = 'archive')::int as glimpses,
  (select count(distinct place_key) from public.photos where not hidden and visibility = 'archive')::int as places,
  (select count(distinct city) from public.photos where not hidden and visibility = 'archive')::int as cities;

grant select on public.archive_photos, public.fresh_photos, public.archive_notes, public.city_words,
  public.city_stats, public.places, public.archive_stats to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Featured: what reaches everyone's home screen.
-- For now an editor picks (feature_photo). photo_scores is ready for when there are enough
-- people for the numbers to mean something: it's never readable from the app.
-- ─────────────────────────────────────────────────────────────

-- Keep rate with a prior: every glimpse starts as if 20 people had seen it at the archive's
-- average keep rate (5%), so one early keep can't decide anything. Combine with an aesthetic
-- score when you add one: score ≈ 0.4 × aesthetic (0–1) + 0.6 × keep_rate_normalised.
create or replace view public.photo_scores as
select
  p.id, p.catalog_no, p.created_at, p.featured_at,
  coalesce(v.viewers, 0)::int as viewers,
  coalesce(k.keepers, 0)::int as keepers,
  (coalesce(k.keepers, 0) + 20 * 0.05) / (coalesce(v.viewers, 0) + 20)::float8 as keep_rate,
  coalesce((p.quality ->> 'passed')::boolean, false) as passed_checks,
  coalesce((p.quality ->> 'override')::boolean, false) as shared_anyway
from public.photos p
left join (select photo_id, count(*) as viewers from public.photo_views group by photo_id) v on v.photo_id = p.id
left join (select photo_id, count(*) as keepers from public.keeps group by photo_id) k on k.photo_id = p.id
where not p.hidden and p.visibility = 'archive';

revoke all on public.photo_scores from anon, authenticated;

-- An editor picks (or un-picks) a glimpse for the home feed. Private glimpses can't be featured.
create or replace function public.feature_photo(target uuid, featured boolean default true)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.editors where user_id = auth.uid()) then
    raise exception 'only editors can feature glimpses';
  end if;
  update public.photos
  set featured_at = case when featured then coalesce(featured_at, now()) else null end
  where id = target and visibility = 'archive' and not hidden;
end;
$$;

-- "You saw these" — at most 50 at a time, once per person, never your own glimpses.
create or replace function public.record_views(ids uuid[])
returns void
language sql security definer set search_path = public
as $$
  insert into public.photo_views (photo_id, user_id)
  select p.id, auth.uid()
  from public.photos p
  where p.id = any (ids[1:50]) and p.visibility = 'archive' and p.user_id <> auth.uid() and auth.uid() is not null
  on conflict do nothing;
$$;

revoke execute on function public.feature_photo(uuid, boolean) from anon;
revoke execute on function public.record_views(uuid[]) from anon;

-- ─────────────────────────────────────────────────────────────
-- Hide everything from whoever made a glimpse or note, without revealing who it is.
-- ─────────────────────────────────────────────────────────────

create or replace function public.block_author(target_photo uuid default null, target_note uuid default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  target_user uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if target_photo is not null then
    select user_id into target_user from public.photos where id = target_photo;
  elsif target_note is not null then
    select user_id into target_user from public.notes where id = target_note;
  end if;
  if target_user is null or target_user = auth.uid() then return; end if;
  insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), target_user)
  on conflict do nothing;
end;
$$;

create or replace function public.unblock_all()
returns void
language sql security definer set search_path = public
as $$ delete from public.blocks where blocker_id = auth.uid(); $$;

-- ─────────────────────────────────────────────────────────────
-- Moderation: hide a glimpse or note once 3 different people report it.
-- Review in Table Editor → photos / notes (filter hidden = true),
-- and set profiles.banned = true for repeat offenders.
-- ─────────────────────────────────────────────────────────────

create or replace function public.hide_reported_content()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.photo_id is not null
     and (select count(*) from public.reports where photo_id = new.photo_id) >= 3 then
    update public.photos set hidden = true where id = new.photo_id;
  end if;
  if new.note_id is not null
     and (select count(*) from public.reports where note_id = new.note_id) >= 3 then
    update public.notes set hidden = true where id = new.note_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_report_hide on public.reports;
create trigger on_report_hide after insert on public.reports
for each row execute function public.hide_reported_content();

-- ─────────────────────────────────────────────────────────────
-- Account deletion (required by Apple guideline 5.1.1(v)).
-- The app deletes the user's image files first, then calls this.
-- ─────────────────────────────────────────────────────────────

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid(); -- cascades to everything they added
end;
$$;

revoke execute on function public.delete_my_account() from anon;
revoke execute on function public.block_author(uuid, uuid) from anon;
revoke execute on function public.unblock_all() from anon;

-- ─────────────────────────────────────────────────────────────
-- Storage: a public "photos" bucket. Each user uploads into a folder named
-- after their user id and can only delete their own files.
-- (Strip EXIF on the phone before upload if you add exact-location sharing.)
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 15728640, array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

create policy "photos: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text and public.can_post());

create policy "photos: list own files" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos: delete own files" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
