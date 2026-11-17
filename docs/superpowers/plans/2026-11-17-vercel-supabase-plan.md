# Vercel + Supabase Implementation Plan
> **For agentic workers:** Use superpowers:executing-plans.
**Goal:** deploy-ready multi-user private journal on Vercel/Supabase.
**Architecture:** browser Supabase Auth; verified bearer Vercel API; RLS PostgreSQL and private Storage. Normalized tables with atomic snapshot RPC preserve interface.
**Tech Stack:** Node 22+, Supabase JS, esbuild, PostgreSQL; PGlite integration tests.
**Spec:** docs/superpowers/specs/2026-11-17-vercel-supabase-design.md
## Global Constraints
No cloud projects exist. Prepare code, SQL, env example and deploy guide. Never trust incoming identity headers. Never use service-role credentials. Every record/photo is private to its user.
## Review Focus
Forged identity, stale concurrent writes, direct cross-user SQL/storage access, expired/missing auth tokens, missing service configuration.
## Task 1 — database and API
- [x] Tests: forged header rejected; getUser verifies bearer; RLS two users; atomic conflict and rollback; Storage prefix policies.
- [x] src/supabase.js createUserStorage(env, token, userId); src/vercel-api.js handleRequest(Request, env); api/index.js Vercel adapter.
- [x] SQL normalized tables + ownership composite FKs, RLS, RPC journal_load and journal_save.
- [x] Run npm test.
## Task 2 — authentication and photo UI
- [x] public/auth.js Supabase email signup/login/logout/recovery; token accessor, ready promise.
- [x] public/app.js auth gating, bearer requests and authenticated photo blobs; no unauthorized state API during initial anonymous session.
- [x] Build static frontend, Vercel rewrites and local server through same API.
- [x] Test missing config, UI transitions and bundle output.
## Task 3 — deliver
- [x] Document env, SQL setup, email redirect URLs, Naver origin registration, old data limitations.
- [x] Full test/build and final independent review; correct important findings.
- [x] Push feature branch and create reviewable PR. Production deployment waits on user's projects.
