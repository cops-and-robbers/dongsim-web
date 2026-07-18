# 함정 모음 (하나씩 실제로 밟아본 것들)

빌드·배포·환경에서 뭔가 이상할 때 여기부터.

## 배포 (Vercel)

- **환경변수는 바꿔도 기존 배포에 적용되지 않는다.** 저장 후 반드시 Redeploy.
  "로컬은 되는데 프로덕션만 안 됨"의 1순위 원인
- OG 이미지 라우트(`opengraph-image.tsx`)가 `readFile`로 읽는 폰트·SVG는
  `next.config.ts`의 `outputFileTracingIncludes`에 등록해야 한다.
  변수로 조합한 경로는 파일 트레이싱이 놓쳐서 **로컬은 되고 프로덕션만 500**이 난다
- ISR 페이지가 "안 바뀐 것처럼" 보이면 대부분 캐시 주기 대기 중이다 (목록 1분, 본문 5분).
  진짜 고장인지 판단하려면 온디맨드 생성되는 상세 URL을 직접 쳐본다

## 빌드·타입체크

- 검증 기준은 `pnpm build`의 **"Compiled successfully"**.
  개발 서버가 떠 있는 상태에서 `tsc`를 돌리면 `.next/dev` 생성 타입 레이스로
  가짜 에러가 날 수 있다. IDE 진단도 편집 직후엔 스테일일 수 있으니 lint/빌드로 확정
- **sharp는 0.34.5 고정** - Next 내장 sharp(0.34.x)와 다른 메이저·마이너가 공존하면
  libvips 네이티브 충돌(`colourspace: parameter space not set`)로 OG 프리렌더가 깨진다.
  버전을 올릴 땐 Next가 내장한 버전과 맞춘다

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
