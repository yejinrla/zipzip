# Member-only collaborative apartment journals

Approved behavior: remove login-free read-only public sharing. Owner adds members by email and removes them; members sign up/log in and may add/edit records and photos for that apartment. Only the owner deletes records or manages membership. No email messages are sent automatically.

Public sharing is retired: journal-share Edge returns410 without accessing records; /api/shared and /api/shares return410; share.html/JS are no longer built. Old journal_shares rows remain private and unused.

Invitations are owner-RLS rows (owner,complex,email,optional member ID). A manually authenticated Edge Function binds pending invitations to the confirmed email returned by Supabase Auth, then authorizes by immutable user UUID. Pending emails do not grant access without confirmed login. Only owner creates/removes invites. No service key reaches Vercel client or browser.

workspace_* RPCs are SECURITY INVOKER, search_path fixed, executable only by service_role. Edge verifies access token against Auth on every request and passes actor UUID internally. Load/save are limited to exactly one owner's complex. Save locks the same owner advisory lock/revision as journal_save, rejects stale revisions, leaves other complexes untouched and forbids members from dropping existing visit IDs. New photo references must belong to the same workspace or already be referenced there. Private bucket policies are unchanged; Edge mediates uploads/downloads with scoped membership checks. A revoked member cannot read or write on subsequent requests.

Client switches to an isolated state/revision for the shared apartment, retaining a personal snapshot that is restored on Home. Personal journal saves never receive collaborative data. Loading a workspace makes the app inert and rechecks dirty/busy state before activation. URL workspace/ workspaceComplex params restore context on refresh; photo loader skips personal Storage path for workspace content.

Deployment: migration 20261118014507_collaborative_journal.sql; journal-workspace Edge includes src/journal-validation.js, handler and index, with verify_jwt=false because the handler verifies Auth itself. journal-share remains retired. Vercel deploy requires no new secrets.

Verification: real local PostgreSQL invitation/RLS/read/write/revision/isolation/revocation tests; Edge Auth/scoped-photo tests; client state isolation/activation-race tests. Production schema privilege checks and anonymous denial verified. No actual user invited, emails sent or real records changed for verification.
