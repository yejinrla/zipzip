create table public.journal_collaborators (
 user_id uuid not null references auth.users(id) on delete cascade,
 complex_id text not null check(length(complex_id) between 1 and 80),
 email text not null check(email=lower(trim(email)) and length(email) between 3 and 254),
 member_id uuid references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,complex_id,email)
);
create index journal_collaborators_member on public.journal_collaborators(member_id);
alter table public.journal_collaborators enable row level security;
revoke all on public.journal_collaborators from public,anon;
grant select,insert,delete on public.journal_collaborators to authenticated;
grant all on public.journal_collaborators to service_role;
create policy collaborators_owner_read on public.journal_collaborators for select to authenticated using ((select auth.uid())=user_id);
create policy collaborators_owner_insert on public.journal_collaborators for insert to authenticated with check ((select auth.uid())=user_id and member_id is null and exists(select 1 from public.complexes c where c.user_id=(select auth.uid()) and c.id=complex_id));
create policy collaborators_owner_delete on public.journal_collaborators for delete to authenticated using ((select auth.uid())=user_id);
create table public.workspace_uploads (
 user_id uuid not null references auth.users(id) on delete cascade,
 complex_id text not null,
 photo_id uuid not null,
 uploader_id uuid not null references auth.users(id) on delete cascade,
 primary key(user_id,complex_id,photo_id)
);
alter table public.workspace_uploads enable row level security;
revoke all on public.workspace_uploads from public,anon,authenticated;
grant all on public.workspace_uploads to service_role;
create function public.workspace_access(p_actor uuid,p_owner uuid,p_complex text) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.complexes c where c.user_id=p_owner and c.id=p_complex) and (p_actor=p_owner or exists(select 1 from public.journal_collaborators m where m.user_id=p_owner and m.complex_id=p_complex and m.member_id=p_actor));
$$;
-- Only the authenticated Edge Function can bind the verified email returned by Auth.
create function public.workspace_claim(p_actor uuid,p_email text) returns void language sql security invoker set search_path='' as $$
 update public.journal_collaborators set member_id=p_actor where email=lower(p_email) and member_id is null;
$$;
create function public.workspace_list(p_actor uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(x),'[]'::jsonb) from (select distinct c.user_id as owner,c.id,c.name,c.address from public.journal_collaborators m join public.complexes c on c.user_id=m.user_id and c.id=m.complex_id where m.member_id=p_actor and m.user_id<>p_actor) x;
$$;
create function public.workspace_load(p_actor uuid,p_owner uuid,p_complex text) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if not public.workspace_access(p_actor,p_owner,p_complex) then raise exception 'Access denied' using errcode='42501';end if;
 return (select jsonb_build_object('revision',(select revision from public.journal_versions where user_id=p_owner),'state',jsonb_build_object('complexes',jsonb_build_array(jsonb_build_object('id',c.id,'name',c.name,'address',c.address,'lat',c.lat,'lng',c.lng,'buildings',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'lat',b.lat,'lng',b.lng,'visits',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'date',v.date::text,'memo',v.memo,'photos',v.photos,'details',v.details) order by v.sort_order) from public.visits v where v.user_id=b.user_id and v.building_id=b.id),'[]'::jsonb)) order by b.sort_order) from public.buildings b where b.user_id=c.user_id and b.complex_id=c.id),'[]'::jsonb))))) from public.complexes c where c.user_id=p_owner and c.id=p_complex);
end $$;
create function public.workspace_save(p_actor uuid,p_owner uuid,p_complex text,p_state jsonb,p_revision text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c jsonb;b jsonb;v jsonb;bi int:=0;vi int;rev text;next_rev text:=gen_random_uuid()::text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
 if not public.workspace_access(p_actor,p_owner,p_complex) then raise exception 'Access denied' using errcode='42501';end if;
 select revision into rev from public.journal_versions where user_id=p_owner;
 if rev is distinct from p_revision then return jsonb_build_object('conflict',true);end if;
 if jsonb_typeof(p_state->'complexes') is distinct from 'array' or jsonb_array_length(p_state->'complexes')<>1 or octet_length(p_state::text)>1048576 then raise exception 'Invalid state';end if;
 c:=p_state->'complexes'->0;
 if c->>'id'<>p_complex or jsonb_typeof(c->'buildings') is distinct from 'array' or jsonb_array_length(c->'buildings')>300 then raise exception 'Invalid complex';end if;
 if p_actor<>p_owner then
  if exists(select 1 from public.visits old join public.buildings ob on ob.user_id=old.user_id and ob.id=old.building_id where ob.user_id=p_owner and ob.complex_id=p_complex and not exists(select 1 from jsonb_array_elements(c->'buildings') nb cross join lateral jsonb_array_elements(nb->'visits') nv where nv->>'id'=old.id)) then raise exception 'Only owner can delete records' using errcode='42501';end if;
  if exists(select 1 from jsonb_array_elements(c->'buildings') nb cross join lateral jsonb_array_elements(nb->'visits') nv cross join lateral jsonb_array_elements_text(nv->'photos') np where not exists(select 1 from public.visits ov join public.buildings ob on ob.user_id=ov.user_id and ob.id=ov.building_id where ob.user_id=p_owner and ob.complex_id=p_complex and ov.photos ? np) and not exists(select 1 from public.workspace_uploads u where u.user_id=p_owner and u.complex_id=p_complex and u.photo_id::text=np)) then raise exception 'Photo outside workspace' using errcode='42501';end if;
 end if;
 delete from public.buildings where user_id=p_owner and complex_id=p_complex;
 for b in select value from jsonb_array_elements(c->'buildings') loop
  if jsonb_typeof(b->'visits') is distinct from 'array' or jsonb_array_length(b->'visits')>500 then raise exception 'Invalid visits';end if;
  insert into public.buildings(user_id,id,complex_id,name,lat,lng,sort_order) values(p_owner,b->>'id',p_complex,b->>'name',(b->>'lat')::float8,(b->>'lng')::float8,bi);bi:=bi+1;vi:=0;
  for v in select value from jsonb_array_elements(b->'visits') loop
   insert into public.visits(user_id,id,building_id,date,memo,photos,details,sort_order) values(p_owner,v->>'id',b->>'id',(v->>'date')::date,v->>'memo',v->'photos',coalesce(v->'details','{}'::jsonb),vi);vi:=vi+1;
  end loop;
 end loop;
 insert into public.journal_versions(user_id,revision) values(p_owner,next_rev) on conflict(user_id) do update set revision=excluded.revision;
 return jsonb_build_object('revision',next_rev);
end $$;
create function public.workspace_upload(p_actor uuid,p_owner uuid,p_complex text,p_photo uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not public.workspace_access(p_actor,p_owner,p_complex) then raise exception 'Access denied' using errcode='42501';end if;
 insert into public.workspace_uploads(user_id,complex_id,photo_id,uploader_id) values(p_owner,p_complex,p_photo,p_actor);
end $$;
revoke all on function public.workspace_access(uuid,uuid,text),public.workspace_claim(uuid,text),public.workspace_list(uuid),public.workspace_load(uuid,uuid,text),public.workspace_save(uuid,uuid,text,jsonb,text),public.workspace_upload(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.workspace_access(uuid,uuid,text),public.workspace_claim(uuid,text),public.workspace_list(uuid),public.workspace_load(uuid,uuid,text),public.workspace_save(uuid,uuid,text,jsonb,text),public.workspace_upload(uuid,uuid,text,uuid) to service_role;
