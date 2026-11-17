# Vercel + Supabase 배포

이 저장소만으로 Vercel 프로젝트 생성·Supabase DB 생성이 자동으로 수행되지는 않습니다. 아래는 새 계정/프로젝트에서 한 번 해야 하는 설정입니다. API 비밀키와 `.env.local`은 GitHub에 올리지 마세요.

## 1. Supabase 프로젝트
1. Supabase 대시보드에서 새 프로젝트를 만들고 가까운 리전을 선택합니다.
2. SQL Editor에서 `supabase/migrations/202611170001_private_journal.sql` 전체를 한 번 실행합니다. 또는 Supabase CLI로 프로젝트를 연결한 뒤 `supabase db push`를 실행합니다. 같은 초기 SQL을 중복 실행하지 마세요.
   이후 추가된 마이그레이션도 파일 이름 순서대로 한 번씩 실행합니다. `202611170002_recent_complexes.sql`은 기기 간에 공유되는 **최근 검색한 아파트** 목록 테이블을 만듭니다. 이 SQL을 실행하기 전에도 앱은 동작하지만 최근 검색 목록은 저장되지 않습니다.
   `202611170003_visit_details.sql`은 방문 기록에 호수·수리·확장·조망·뷰·위아래 소음·결로/곰팡이 항목을 저장하는 `details` 컬럼을 추가합니다. **이 SQL을 먼저 실행한 뒤 앱을 배포하세요.** 이전 함수는 이 항목들을 저장하지 않고 버립니다.
3. Table Editor에서 `complexes`, `buildings`, `visits`, `journal_versions`, `user_settings`, `recent_complexes` 테이블을 확인합니다. 각 테이블에 RLS가 켜져 있어야 합니다.
4. Storage에 `journal-photos` 버킷이 생겼는지 확인합니다. **Public을 켜지 마세요.** 사용자 폴더별 접근 정책은 SQL에 포함되어 있습니다.
5. Project Settings → API에서 Project URL과 **anon key 또는 publishable key**를 확인합니다. `service_role`, `sb_secret_...` 키를 사용하지 마세요. 이 앱에는 관리자 키가 필요 없습니다.
6. Authentication → Providers에서 Email 로그인을 활성화하고 Confirm email을 켭니다. 필요하면 비밀번호 최소 길이를 8자 이상으로 설정합니다.

## 2. Vercel에서 GitHub 연결
1. Vercel의 Add New Project → GitHub `yejinrla/zipzip`을 Import합니다.
2. 처음 검토할 때는 이 변경의 PR 브랜치 `feat/vercel-supabase`로 Preview를 배포하거나, PR을 main에 병합한 뒤 Production을 배포합니다.
3. Framework Preset은 Other, Build Command는 `npm run build`, Output Directory는 `dist`입니다. Node.js 22 이상을 선택합니다. `vercel.json`이 API 경로와 보안 헤더를 설정합니다.
4. Environment Variables에 아래 항목을 추가합니다. Preview/Production에 각각 사용할 프로젝트를 의식해서 선택하세요.

| 이름 | 값 | 위치 |
|---|---|---|
| `SUPABASE_URL` | Supabase Project URL | Project Settings → API |
| `SUPABASE_ANON_KEY` | anon/publishable key | Project Settings → API |
| `NAVER_MAP_KEY` | 신규 Maps Web Dynamic Map Key ID | 네이버 클라우드 |
| `NAVER_SEARCH_ID` | 지역 검색 Client ID | 네이버 클라우드 NAVER API HUB |
| `NAVER_SEARCH_SECRET` | 지역 검색 Client Secret | 네이버 클라우드 NAVER API HUB |

Supabase 두 값은 필수입니다. 네이버 값은 지도·검색을 쓰려면 필요합니다. 환경변수를 바꾼 뒤 Redeploy하세요. GitHub Import를 마치면 연결된 브랜치의 푸시가 Vercel 배포를 트리거합니다.

## 3. 로그인 이메일과 URL
1. 배포 주소가 생기면 Supabase Authentication → URL Configuration의 Site URL을 `https://실제서비스주소`로 지정합니다.
2. Redirect URLs에 `https://실제서비스주소/`와 `https://실제서비스주소/?recovery=1`을 추가합니다. 로컬 테스트용 `http://localhost:3000/`와 `http://localhost:3000/?recovery=1`도 추가할 수 있습니다.
3. Preview에서 로그인 테스트를 한다면 해당 Preview URL도 등록합니다. 불필요하게 모든 외부 도메인을 허용하지 마세요.
4. Supabase 기본 발신 이메일은 개발용 제한이 있습니다. 여러 사용자에게 공개하기 전 Authentication의 Custom SMTP에 본인의 발신 서비스를 연결하고 발신 도메인을 설정하세요.
5. 회원가입 → 인증 메일 → 로그인, 비밀번호 찾기 → 메일 링크 → 새 비밀번호 저장 → 재로그인을 실제 메일로 확인합니다.

## 4. 네이버 지도
신규 네이버 클라우드 Maps 서비스의 **Web Dynamic Map**을 사용합니다. 웹 서비스 URL에 실제 Vercel 도메인과 로컬 origin을 등록합니다. 네이버 클라우드 NAVER API HUB의 지역 검색 API는 Maps와 별도 인증 정보입니다. NAVER API HUB의 NAVER 검색 → 지역을 활성화하고 해당 앱의 Client ID/Secret을 사용합니다. 공통 키를 Vercel 환경변수에 두면 일반 사용자는 지도 연결 설정 없이 이용할 수 있습니다.

## 5. 공개 전 확인
- A/B 두 계정으로 같은 단지를 각각 등록하고 메모와 사진이 섞이지 않는지 확인합니다.
- A의 사진 URL을 B에서 요청하면 사진을 받지 못해야 합니다.
- 로그아웃 후 기록 API가 401을 반환해야 합니다.
- 두 탭에서 수정하면 늦은 탭이 충돌 안내를 표시하고 작성 내용은 남아 있어야 합니다.
- 실제 휴대폰에서 검색 → 기록 추가(동 이름 입력) → 사진·메모 저장 → 재로그인 후 읽기를 확인합니다.

## 이전 배포
이번 소스 변경은 기존 Sites 배포와 데이터에 영향을 주지 않습니다. 기존 실제 데이터가 있다면 별도의 내보내기·계정 매핑·가져오기 작업을 준비한 뒤 이전해야 합니다. 이 저장소에 사용자 데이터나 인증 정보는 포함하지 않습니다.
