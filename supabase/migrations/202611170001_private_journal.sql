-- Run once in Supabase SQL Editor or with supabase db push.
create table public.journal_versions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision text not null default gen_random_uuid()::text
);
create table public.complexes (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check(length(id) between 1 and 80),
 name text not null check(length(name) between 1 and 120),
 address text not null check(length(address)<=300),
 lat double precision not null check(lat between 33 and 39.5),
 lng double precision not null check(lng between 124 and 132),
 sort_order integer not null default 0,
 primary key(user_id,id)
);
create table public.buildings (
 user_id uuid not null, id text not null check(length(id) between 1 and 80), complex_id text not null,
 name text not null check(length(name) between 1 and 40),
 lat double precision not null check(lat between 33 and 39.5), lng double precision not null check(lng between 124 and 132),
 sort_order integer not null default 0,
 primary key(user_id,id), foreign key(user_id,complex_id) references public.complexes(user_id,id) on delete cascade
);
create table public.visits (
 user_id uuid not null, id text not null check(length(id) between 1 and 80), building_id text not null,
 date date not null, memo text not null default '' check(length(memo)<=10000),
 photos jsonb not null default '[]' check(jsonb_typeof(photos)='array' and jsonb_array_length(photos)<=12),
 sort_order integer not null default 0,
 primary key(user_id,id), foreign key(user_id,building_id) references public.buildings(user_id,id) on delete cascade
);
create index buildings_complex on public.buildings(user_id,complex_id);
create index visits_building on public.visits(user_id,building_id);
create table public.user_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 map_key text not null default '' check(length(map_key)<=200),
 search_id text not null default '' check(length(search_id)<=200),
 search_secret text not null default '' check(length(search_secret)<=500)
);
-- Grant no anonymous data access. Enforce ownership even on direct REST requests.
do $$ declare t text; begin
 foreach t in array array['journal_versions','complexes','buildings','visits','user_settings'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy owner_only on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 end loop;
end $$;

create function public.journal_load() returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object('revision',(select revision from public.journal_versions where user_id=auth.uid()),
 'state',jsonb_build_object('complexes',coalesce((select jsonb_agg(jsonb_build_object(
 'id',c.id,'name',c.name,'address',c.address,'lat',c.lat,'lng',c.lng,
 'buildings',coalesce((select jsonb_agg(jsonb_build_object(
 'id',b.id,'name',b.name,'lat',b.lat,'lng',b.lng,
 'visits',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'date',v.date::text,'memo',v.memo,'photos',v.photos) order by v.sort_order) from public.visits v where v.user_id=b.user_id and v.building_id=b.id),'[]'::jsonb)
 ) order by b.sort_order) from public.buildings b where b.user_id=c.user_id and b.complex_id=c.id),'[]'::jsonb)
 ) order by c.sort_order) from public.complexes c where c.user_id=auth.uid()),'[]'::jsonb)));
$$;

create function public.journal_save(p_state jsonb,p_revision text default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); current_rev text; next_rev text:=gen_random_uuid()::text; c jsonb; b jsonb; v jsonb; ci int:=0; bi int; vi int;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_state is null or jsonb_typeof(p_state->'complexes') is distinct from 'array' or jsonb_array_length(p_state->'complexes')>200 or octet_length(p_state::text)>1048576 then raise exception 'Invalid journal'; end if;
 -- Serialize per-user writes, including the very first save.
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select revision into current_rev from public.journal_versions where user_id=u;
 if current_rev is distinct from p_revision then return jsonb_build_object('conflict',true); end if;
 delete from public.complexes where user_id=u;
 for c in select value from jsonb_array_elements(p_state->'complexes') loop
  if jsonb_typeof(c->'buildings') is distinct from 'array' or jsonb_array_length(c->'buildings')>300 then raise exception 'Invalid buildings'; end if;
  insert into public.complexes(user_id,id,name,address,lat,lng,sort_order) values(u,c->>'id',c->>'name',c->>'address',(c->>'lat')::double precision,(c->>'lng')::double precision,ci); ci:=ci+1;bi:=0;
  for b in select value from jsonb_array_elements(c->'buildings') loop
   if jsonb_typeof(b->'visits') is distinct from 'array' or jsonb_array_length(b->'visits')>500 then raise exception 'Invalid visits'; end if;
   insert into public.buildings(user_id,id,complex_id,name,lat,lng,sort_order) values(u,b->>'id',c->>'id',b->>'name',(b->>'lat')::double precision,(b->>'lng')::double precision,bi);bi:=bi+1;vi:=0;
   for v in select value from jsonb_array_elements(b->'visits') loop
    insert into public.visits(user_id,id,building_id,date,memo,photos,sort_order) values(u,v->>'id',b->>'id',(v->>'date')::date,v->>'memo',v->'photos',vi);vi:=vi+1;
   end loop;
  end loop;
 end loop;
 insert into public.journal_versions(user_id,revision) values(u,next_rev) on conflict(user_id) do update set revision=excluded.revision;
 return jsonb_build_object('revision',next_rev);
end $$;
revoke all on function public.journal_load() from public,anon;
revoke all on function public.journal_save(jsonb,text) from public,anon;
grant execute on function public.journal_load() to authenticated;
grant execute on function public.journal_save(jsonb,text) to authenticated;

-- Vercel request bodies must remain below 4.5 MB. App caps photos at 4 MiB.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('journal-photos','journal-photos',false,4194304,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy journal_photo_read on storage.objects for select to authenticated
 using(bucket_id='journal-photos' and split_part(name,'/',1)=(select auth.uid())::text);
create policy journal_photo_insert on storage.objects for insert to authenticated
 with check(bucket_id='journal-photos' and split_part(name,'/',1)=(select auth.uid())::text);
create policy journal_photo_delete on storage.objects for delete to authenticated
 using(bucket_id='journal-photos' and split_part(name,'/',1)=(select auth.uid())::text);
