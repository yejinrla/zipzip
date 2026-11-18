# Apartment basic information

User approved basic information only, using public sources rather than private Naver Real Estate endpoints. Place a small information card between selected-complex card and map. Show use-approval date, households, building count and heating, plus parking when available. Missing fields are omitted. No price or listing data.

Use server-only DATA_GO_KR_SERVICE_KEY authorized for these official services:
- https://www.data.go.kr/data/15057332/openapi.do (AptListService4)
- https://www.data.go.kr/data/15058453/openapi.do (AptBasisInfoServiceV5)

Existing VWorld key resolves the selected complex point to a legal-dong code. List local K-apt complexes and require a unique normalized name. Require returned basic info code/name to agree. Avoid guessed fuzzy matches. K-apt does not cover every apartment. Display source and lookup date; lookup date is not source modification date.

Implementation: src/complex-info.js provider adapter; GET /api/complex-info?complex=<owned id> verifies personal complex first. Optional parking detail failure leaves core basic fields available. Each external request timeout is 3.5s. Browser only caches successful responses and ignores late results on navigation. No persistence or schema changes.

Activation: In data.go.kr request access to both services. Add the Decoding key as DATA_GO_KR_SERVICE_KEY in production Vercel env and redeploy. Do not paste keys in chat. Provider calls are not live-verified until key is configured. Official current JSON service routes verified from portal metadata; external field mappings and JSON envelopes require live validation.
