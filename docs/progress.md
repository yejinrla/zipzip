# Progress
Task 1: complete — authenticated R2 API, ETag concurrency, validation, private photos/settings; 8 API tests pass.
Task 2: implementation complete — responsive Korean UI, Naver integration, explicit memory-only sample, records/photos CRUD. Regression tests cover saving navigation and initialization/sample race.
Review: independent reviewer identified settings/search ID retention, upload navigation, initial sample race; all addressed with failing then passing regression tests.
Ruling: supplied Sites helper and Vinext starter absent on selected machine — dependency-free embedded Worker implemented; ordinary Git and native Sites publish will be used. Cost: no framework starter integration; R2 schema validated by deployment.
Verification limitation: managed preview first failed because dev server did not honor CLI port; repaired CLI port parsing, second attempt failed because relay readiness timed out. No browser QA or viewport claims.
Deferred minor: deleting visits leaves unreferenced original photo objects; document storage retention rather than deleting potentially referenced photos.

# Vercel + Supabase migration (2026-11-17)
The original Worker sections above describe the previous deployed version. Current source targets Vercel Node/static hosting, Supabase Auth, PostgreSQL RLS and private Storage.
Task 1: complete — verified bearer identity, normalized PostgreSQL and transactional revision RPC. Direct cross-user SQL/settings/Storage paths tested in PGlite.
Task 2: complete — email/password signup, confirmation, logout, recovery UI; token-authenticated photo reads, lazy visible-photo requests, three concurrent downloads and bounded revocable blob cache.
Ruling: user has no cloud projects and requested deploy-ready source first. Real Vercel/Supabase resources, email delivery and Naver integration remain unverified until configured. No existing Sites data is automatically migrated.
Final review: independent reviewer requested lazy bounded photo loading; addressed with regression test. No important access-control finding.
Deferred minor: removed records leave unreferenced originals in private Storage. Cleanup policy remains documented.
