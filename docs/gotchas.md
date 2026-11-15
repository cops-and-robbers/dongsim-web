# 함정 모음 (하나씩 실제로 밟아본 것들)

빌드·배포·환경에서 뭔가 이상할 때 여기부터.

## 배포 (Vercel)

- **환경변수는 바꿔도 기존 배포에 적용되지 않는다.** 저장 후 반드시 Redeploy.
  "로컬은 되는데 프로덕션만 안 됨"의 1순위 원인
- OG 이미지 라우트(`opengraph-image.tsx`)가 `readFile`로 읽는 폰트·SVG는
  `next.config.ts`의 `outputFileTracingIncludes`에 등록해야 한다.
  변수로 조합한 경로는 파일 트레이싱이 놓쳐서 **로컬은 되고 프로덕션만 500**이 난다
- ISR 페이지가 "안 바뀐 것처럼" 보이면 캐시를 버리는 장치가 그 저장 경로에 있는지부터 본다.
  블로그는 동기화가, 홈 행사, 팀, 온라인 입구는 어드민 저장이 바로 버린다. 시간 주기(블로그 1시간,
  홈과 온라인 5분)는 놓쳤을 때를 위한 것이다. 진짜 고장인지 판단하려면 온디맨드 생성되는 상세 URL을 직접 쳐본다

## Vercel 무료 사용량 (Hobby)

2026-11-15 Fluid Active CPU(30일 4시간)의 75%를 넘어 경고 메일을 받았다(#335). 다 쓰면 Vercel 이
프로젝트를 멈춘다. 카드가 없어 돈이 나가는 대신 사이트와 어드민이 같이 꺼진다.

- **어디서 쓰나 보는 법:** Vercel Usage → Fluid Active CPU 에서 Projects, Type(function, middleware)
  탭. 경로별은 프로젝트 Observability → Functions(최근 12시간). Middleware 경로별 표는 유료라 예시 데이터만 나온다
- **`proxy.ts` 매처를 넓게 잡지 않는다.** `_next` 만 빼면 폰트 조각, `public/` 그림, 링크 미리 읽기마다 돈다.
  홈 한 번에 68번, 사용량의 절반이었다. 도메인으로 고를 일은 매처의 `has: [{ type: "header", key: "host" }]` 로,
  경로로 고를 일은 경로로 좁힌다. 바꾸면 `lib/proxy.test.mjs` 를 같이 고친다
- **페이지 `revalidate` 보다 안쪽 캐시가 짧으면 그게 페이지 주기다.** Next 는 페이지 안의 `fetch`·`unstable_cache`
  주기 중 가장 짧은 것을 페이지에 쓴다. `revalidate = 60` 이던 홈이 행사 캐시 30초 때문에 30초마다 다시 만들어졌다.
  주기를 바꿀 때는 그 페이지가 읽는 캐시까지 같이 본다
- **짧은 주기 대신 바뀔 때 버린다.** 어드민 저장이나 동기화처럼 바뀌는 시점을 알면 `revalidateTag`·`revalidatePath` 로 버리고,
  시간 주기는 놓쳤을 때를 위한 값으로 길게 둔다. 시점을 모르는 데이터(커뮤니티 글처럼 앱 사용자가 올리는 것)만 짧게 둔다
- 하루 예산은 대략 8분(4시간/30일)이다. 어드민을 켜 둔 탭의 주기적 읽기도 여기서 나간다

## 빌드·타입체크

- 검증 기준은 `pnpm build`의 **"Compiled successfully"**.
  개발 서버가 떠 있는 상태에서 `tsc`를 돌리면 `.next/dev` 생성 타입 레이스로
  가짜 에러가 날 수 있다. IDE 진단도 편집 직후엔 스테일일 수 있으니 lint/빌드로 확정
- **sharp는 0.34.5 고정** - Next 내장 sharp(0.34.x)와 다른 메이저·마이너가 공존하면
  libvips 네이티브 충돌(`colourspace: parameter space not set`)로 OG 프리렌더가 깨진다.
  버전을 올릴 땐 Next가 내장한 버전과 맞춘다
- **페이지를 `app/` 바로 아래에 만들면 안 된다.** 루트 레이아웃은 언어 묶음
  `app/(ko)`·`app/(en)`·`app/(ja)`마다 있고 `app/layout.tsx`는 없다(#301).
  묶음 밖 페이지는 `pnpm build`에서 루트 레이아웃이 없다고 실패한다.
  `pnpm dev`는 Next가 `app/layout.tsx`를 저절로 만드는데, 이 파일이 세 묶음을 모두 감싸
  화면이 깨지니 지우고 커밋하지 않는다. 다른 브랜치를 리베이스할 때 그쪽이 옛 위치
  (`app/admin/...` 등)에 새로 만든 파일도 묶음으로 옮긴다(#304에서 실제로 남았다)

## pnpm (Windows 로컬)

- 루트의 `pnpm-workspace.yaml`은 **워크스페이스 경계 파일**이다 - 지우면 pnpm이
  홈 디렉토리의 잔여 `package.json`/`pnpm-workspace.yaml`을 루트로 오인해
  엉뚱한 곳(홈)에 설치하고 Next 빌드가 "workspace root" 에러로 깨진다
- `pnpm install`이 TTY 없이 modules purge를 물으면: `CI=true pnpm install --no-frozen-lockfile`
- git의 `LF will be replaced by CRLF` 경고는 무해하다 (Windows)

## 외부 서비스

- 노션: 통합(연결)을 DB에 추가하는 걸 잊으면 토큰이 있어도 404/빈 목록.
  토큰 재발급 시 로컬 `.env.local` + Vercel env + **Redeploy** 세 가지 전부
- 카카오톡은 OG 카드를 오래 캐시한다 - 수정 후엔 카카오 공유 디버거에서 캐시 초기화
- Upstash Redis 리더보드 스키마를 바꾸면 기존 데이터와 형식이 어긋난다 - 콘솔에서 FLUSHDB
