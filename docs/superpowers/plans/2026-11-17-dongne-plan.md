# Dongne Note Implementation Plan
> **For agentic workers:** Use superpowers:executing-plans task-by-task.
**Goal:** 네이버 지도 기반 개인 아파트 임장 기록 웹사이트 배포.
**Architecture:** Worker에서 인증·네이버 검색·R2 레코드/사진 저장. 정적 UI는 빌드 시 Worker에 포함. 외부 패키지 없이 Node 테스트.
**Tech Stack:** JavaScript, Web APIs, Cloudflare Worker/R2, Naver Maps v3.
**Spec:** docs/superpowers/specs/2026-11-17-dongne-design.md
## Global Constraints
한국어, 모바일 대응, 사용자별 서버 접근 확인, 비공개 배포 유지. 비밀키는 서버에만 저장.
## Review Focus
미인증 접근 차단, 사용자간 사진 격리, 동시 수정 충돌, 잘못된 좌표/날짜/사진 검증, 외부 API 실패 시 보존.
## Task 1: Server API
Files: src/api.js, tests/api.test.js.
Interfaces: handleApi(Request, env) → Response; BUCKET get/put/delete.
- [ ] 인증/소유권/충돌/유효성 테스트 작성, node --test 실패 확인.
- [ ] /api/state GET/PUT, /api/settings GET/POST, /api/search GET, /api/photos POST/GET 구현.
- [ ] node --test 통과.
## Task 2: Interface and build
Files: public/index.html, public/app.js, public/style.css, scripts/build.mjs, scripts/dev.mjs.
Consumes: state {complexes:[{id,name,address,lat,lng,buildings:[{id,name,lat,lng,visits:[{id,date,memo,photos:[]}]}]}]}, revision.
- [ ] 지도/검색/동 CRUD/기록 CRUD/사진/설정/충돌 안내 구현.
- [ ] 빌드 후 브라우저에서 샘플 기록 흐름과 모바일 확인.
## Task 3: Package and publish
- [ ] 전체 테스트/구문검사/빌드, 변경사항 검토.
- [ ] 정확한 소스 커밋 푸시, dist tar 생성, 비공개 배포.
- [ ] 실제 배포 URL과 네이버 키 연결 필요 여부 전달.
