-- Structured visit details: unit number, renovation, expansion, outlook, view,
-- noise from neighbours above/below, condensation/mould.
-- Run once in Supabase SQL Editor after 202611170002, BEFORE deploying the app
-- version that writes details (older functions would drop them silently).
alter table public.visits add column details jsonb not null default '{}'
 check(jsonb_typeof(details)='object' and octet_length(details::text)<=2000);

create or replace function public.journal_load() returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object('revision',(select revision from public.journal_versions where user_id=auth.uid()),
 'state',jsonb_build_object('complexes',coalesce((select jsonb_agg(jsonb_build_object(
 'id',c.id,'name',c.name,'address',c.address,'lat',c.lat,'lng',c.lng,
 'buildings',coalesce((select jsonb_agg(jsonb_build_object(
 'id',b.id,'name',b.name,'lat',b.lat,'lng',b.lng,
 'visits',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'date',v.date::text,'memo',v.memo,'photos',v.photos,'details',v.details) order by v.sort_order) from public.visits v where v.user_id=b.user_id and v.building_id=b.id),'[]'::jsonb)
 ) order by b.sort_order) from public.buildings b where b.user_id=c.user_id and b.complex_id=c.id),'[]'::jsonb)
 ) order by c.sort_order) from public.complexes c where c.user_id=auth.uid()),'[]'::jsonb)));
$$;

create or replace function public.journal_save(p_state jsonb,p_revision text default null) returns jsonb
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
    insert into public.visits(user_id,id,building_id,date,memo,photos,details,sort_order) values(u,v->>'id',b->>'id',(v->>'date')::date,v->>'memo',v->'photos',case when jsonb_typeof(v->'details')='object' then v->'details' else '{}'::jsonb end,vi);vi:=vi+1;
   end loop;
  end loop;
 end loop;
 insert into public.journal_versions(user_id,revision) values(u,next_rev) on conflict(user_id) do update set revision=excluded.revision;
 return jsonb_build_object('revision',next_rev);
end $$;
