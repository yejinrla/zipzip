# 집.zip 작업 규칙

Codex와 Claude Code가 함께 읽는 파일입니다. 코드만 봐서는 알 수 없는 함정만 적습니다.
같은 실수가 두 번 나왔을 때만 한 줄씩 추가합니다.

## 배포
- `main`에 푸시하면 Vercel이 곧바로 운영(zipzip-mu.vercel.app)에 배포한다. 작업은 브랜치에서 하고 `npm test`와 `npm run build`가 통과한 뒤에만 `main`에 올린다.
- `vercel.json`의 `"regions": ["icn1"]`을 지우지 않는다. 브이월드 API가 해외 서버 요청을 막아서, 미국 리전에서는 동 조회가 `NETWORK_ERROR`로 실패했다.
- 외부 폰트·스크립트·이미지 주소를 새로 쓰면 `vercel.json`의 CSP도 함께 고친다. 빠뜨리면 브라우저가 조용히 막는다.

## 데이터베이스
- `supabase/migrations/`의 SQL은 자동 실행되지 않는다. 사람이 Supabase SQL Editor에서 파일 이름 순서대로 실행한다.
- DB를 바꾸는 작업은 SQL을 먼저 실행하고 확인한 뒤에 코드를 배포한다. 순서가 바뀌면 `journal_save`가 모르는 값을 오류 없이 버린다.
- `journal_save`는 저장할 때마다 단지·동·방문 행을 전부 지우고 다시 넣는다. 다른 테이블에서 `complexes`를 외래키로 참조하면 저장할 때마다 같이 지워진다.

## 기록 상세 항목
- 방문 상세(호수, 가격, 수리, 향 등)는 `visits.details` JSON 하나에 저장한다. 항목을 추가할 때는 SQL 없이 세 곳을 함께 고친다: `src/api.js`의 `DETAIL_CHOICES`/`DETAIL_TEXT`(서버 검증), `public/app.js`의 `DETAIL_CHOICES`, `public/index.html`의 입력 칸. 서버 목록에 없는 값은 저장이 거절된다.

## 사진
- 사진은 브라우저가 로그인 세션으로 Supabase Storage(`journal-photos`, 비공개)에서 직접 받는다(`public/auth.js`의 `photo`). `/api/photos/:id`는 예비 경로다. 이 경로는 운영에서 응답 없이 끊긴 적이 있으니(`NETWORK_REQUEST`) 다시 주 경로로 되돌리지 않는다.

## 빌드와 테스트
- `public/auth.js`와 `public/photos.js`는 esbuild로 묶이고, `public/app.js`는 그대로 복사된다. `app.js`에는 `import`를 쓸 수 없다. `dist/`는 빌드 결과물이라 직접 고치지 않는다.
- `tests/ui-state.test.js`는 `app.js`를 가짜 DOM에서 실행하고, 화면 요소를 `children[0]` 같은 위치로 찾는다. 렌더 함수의 마크업 순서를 바꾸면 해당 테스트의 위치도 같이 고친다. 요소 `id`는 바꾸지 않는다.

## 비밀과 외부 자료
- `.env.local`과 키 파일은 커밋하지 않는다. 네이버·브이월드 키는 Vercel 환경변수에만 두고 브라우저로 보내지 않는다. 브라우저에는 Supabase anon 키만 쓴다.
- 외부 스킬 파일은 저장소에 복사하지 않는다. `.claude/hooks/session-start.sh`가 세션을 시작할 때 원본 저장소에서 설치한다.
