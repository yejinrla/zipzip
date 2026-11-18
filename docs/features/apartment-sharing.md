# Revocable apartment journal sharing

Approved scope: a link holder can read all complex-level and dong/unit records and photos for one apartment without logging in. Only the owner can enable or revoke. No messages are sent automatically and no existing journal is shared until its owner clicks Create link.

Architecture:
- journal_shares stores (user_id, complex_id, random UUID-v4 token). Owner-only RLS SELECT/INSERT/DELETE; INSERT requires an owned complex. No anonymous table access. No FK to complexes because journal_save replaces complex rows transactionally.
- Owner management GET/POST/DELETE /api/shares?complex=id verifies Supabase user, checks owned apartment, and uses that user's JWT for all PostgREST requests. Existing token is reused; revoking deletes it, enabling again generates a new token. Concurrent mutations are serialized per apartment across dialog closure.
- /share.html#token is a separate login-free read-only page. Token stays in fragment and is sent via x-share-token to GET /api/shared. No search indexing, no-referrer and no-store. Existing private application authentication stays intact.
- Vercel forwards read requests to Supabase Edge Function journal-share in a POST body, keeping tokens out of request URLs. JWT verification is false because this public function authenticates a capability token instead. Configuration is checked in.
- Edge uses its platform-provided server-only service_role key. It first resolves a share, then reads exactly that owner's apartment. Photo requests require a photo ID referenced by that apartment's visits before private Storage download. No public bucket or Storage policy change. No credentials or user account fields returned. It exposes only read operations.
- Reads reflect current records. Revocation blocks subsequent record and photo requests; it cannot erase data someone already downloaded. No signed URLs or CDN cache extends access.

Tests: local PostgreSQL owner RLS and anonymous denial; API ownership, token shape, no writes; Edge record scope and photo membership; close/reopen mutation ordering. Production schema/advisors and unknown-token public read verified. Signed-in creation with real user records is left to the owner's UI, without auto-publishing private data.

Deployment: migration journal_shares, then Edge Function (handler.js/index.ts, verify_jwt=false), then Vercel main build. Edge uses built-in SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY; no new Vercel secret.

CLI migration creation was attempted but the CLI cannot create /home/agent/.supabase in this environment. The committed migration was written locally and applied through the Supabase migration tool.
