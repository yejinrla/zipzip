# Building overlay implementation plan

> Execute inline within existing authorized repository; verify before main push.

**Goal:** Click automatically sourced apartment dongs and proceed to private record page.
**Architecture:** Server-only VWorld adapter, owned-complex endpoint, client polygons plus labels. No database schema changes.
**Tech Stack:** Vanilla JS, Node, Naver Maps SDK, existing Supabase owner storage.
**Spec:** docs/superpowers/specs/2026-11-17-building-overlay-design.md

## Constraints
Keep credentials server-side. Preserve existing records and manual pins. Never invent dong numbers. Provider coverage must be explicitly unverified until key is configured.

## Review focus
Unowned complex, provider failures, malformed geometry, adjacent complexes, stale navigation, cancel/proceed, duplicate dong.

- [x] Add failing endpoint tests for ownership, missing configuration, same-name footprints and key secrecy.
- [x] Implement src/building-data.js loadBuildingData(c,env), wire GET /api/buildings?complex=<own id> in src/api.js.
- [x] Add failing UI test for confirm/cancel, saving and reusing an existing dong.
- [x] Add bounded runtime cache, stale request guard, polygons/labels and status/retry to public app.
- [x] Run npm test, npm run build, scripts/smoke.mjs, git diff --check.
- [x] Independent review; fixed placement forwarding and provider-side name filtering.
- [ ] Main push and deployment check.
- [ ] Owner configures key; validate live selected-apartment coverage.
