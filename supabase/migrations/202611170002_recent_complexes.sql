-- Recently searched apartments, shared across a user's devices.
-- Run once in Supabase SQL Editor (after 202611170001) or with supabase db push.
-- No foreign key to complexes: journal_save rewrites complexes on every save,
-- so the client skips IDs that are no longer in the user's journal.
create table public.recent_complexes (
 user_id uuid primary key references auth.users(id) on delete cascade,
 ids jsonb not null default '[]' check(jsonb_typeof(ids)='array' and jsonb_array_length(ids)<=8),
 updated_at timestamptz not null default now()
);
alter table public.recent_complexes enable row level security;
revoke all on public.recent_complexes from anon;
grant select,insert,update,delete on public.recent_complexes to authenticated;
create policy owner_only on public.recent_complexes for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
