-- Share capabilities are private. Public reads pass through the journal-share Edge Function.
-- No FK to complexes: journal_save replaces complex rows within its transaction.
create table public.journal_shares (
 user_id uuid not null references auth.users(id) on delete cascade,
 complex_id text not null check(length(complex_id) between 1 and 80),
 token uuid not null default gen_random_uuid() unique,
 created_at timestamptz not null default now(),
 primary key(user_id,complex_id)
);
alter table public.journal_shares enable row level security;
revoke all on public.journal_shares from public,anon;
grant select,insert,delete on public.journal_shares to authenticated;
create policy journal_share_owner_read on public.journal_shares for select to authenticated using ((select auth.uid())=user_id);
create policy journal_share_owner_create on public.journal_shares for insert to authenticated with check ((select auth.uid())=user_id and exists(select 1 from public.complexes c where c.user_id=(select auth.uid()) and c.id=complex_id));
create policy journal_share_owner_delete on public.journal_shares for delete to authenticated using ((select auth.uid())=user_id);
