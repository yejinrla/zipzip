# 동네노트 / zipzip
한국 아파트 단지를 검색하고 지도에 동 위치를 등록한 뒤, 동별 방문일·메모·사진을 남기는 웹사이트입니다. 여러 사람이 가입할 수 있고 각자의 기록과 사진은 본인만 볼 수 있습니다.

**현재 소스는 Vercel + Supabase용입니다.** 이전 ChatGPT Sites 배포는 이전 버전으로 남아 있으며 GitHub 변경으로 자동 갱신되지 않습니다. 새 배포는 [설정 가이드](docs/DEPLOY.md)를 따라 진행하세요.

## 구성
- 기존 HTML/CSS/JS 화면, Supabase JS 이메일 인증·로그인·로그아웃·비밀번호 재설정
- Vercel Node API가 Supabase Auth로 매 요청의 액세스 토큰을 검증
- PostgreSQL `complexes`, `buildings`, `visits` 테이블과 사용자별 RLS
- 트랜잭션 + 사용자별 잠금 + 버전 검사로 다른 창의 저장 덮어쓰기 방지
- 비공개 `journal-photos` Storage, 사용자 UUID 경로별 RLS, 인증된 API로 사진 열람
- 네이버 Maps v3와 지역 검색 API. 개별 동 위치는 사용자가 직접 추가

## 로컬 실행
Node.js 22 이상이 필요합니다.
```sh
npm ci
cp .env.example .env.local
# .env.local에 프로젝트의 URL과 anon/publishable key 입력
# Supabase에 supabase/migrations/202611170001_private_journal.sql 적용
npm run dev
```
환경변수가 없으면 연결 준비 화면이 표시됩니다. 로컬에서도 로그인 없이 임의 사용자로 저장하지 않습니다.

```sh
npm test
npm run build
```
테스트는 API 인증, 위조 헤더 차단, 사용자 격리, 동시 수정 충돌, PostgreSQL RLS 및 Storage 정책을 검증합니다. PostgreSQL 검증은 PGlite에서 실행합니다. 실제 Supabase Auth 메일 발송/프로덕션 Storage와 네이버 지도는 실 프로젝트 연결 후 별도 확인해야 합니다.

## 제한과 데이터 이전
- 사진은 JPG/PNG/WebP, 장당 4 MiB, 기록당 최대 12장입니다. Vercel 요청 크기 제한을 고려했습니다.
- 삭제한 기록에서 참조하던 원본 사진은 Storage에 남습니다. 정리 정책은 후속 구현이 필요합니다.
- 첫 버전은 전체 기록을 한 트랜잭션으로 저장합니다. 사용자가 많은 기록을 쌓는 서비스로 확장하면 동·방문별 저장 API를 도입할 수 있습니다.
- 이전 Sites 계정 ID와 Supabase 계정 UUID는 다릅니다. 기존 실제 기록·사진은 자동 이전하지 않습니다. `.local-data`도 자동 업로드하지 않습니다.
- 배포 환경변수의 네이버 키를 사용하면 이용자마다 별도 키를 준비할 필요가 없습니다. 개인 키는 연결 설정에서 선택적으로 지정할 수 있습니다.
