# 도메인 이관 체크리스트 (copsnro66ers.site -> copsandrobbers.app)

도메인을 `copsnro66ers.site`에서 `copsandrobbers.app`으로 바꿀 때, 앱·백엔드·웹·인프라에서 변경해야 할 사항을 정리한 문서입니다.

## 도메인 매핑 (구 -> 신)

| 용도 | 현재 (구) | 신규 |
| --- | --- | --- |
| 웹사이트 | copsnro66ers.site | copsandrobbers.app |
| 운영 API | api.copsnro66ers.site | api.copsandrobbers.app |
| 개발 API | dev-api.copsnro66ers.site | dev-api.copsandrobbers.app |
| 어드민 | admin.copsnro66ers.site | admin.copsandrobbers.app |

## 특이사항: .app 은 HTTPS 전용

`.app`은 구글 소유 TLD로 **HSTS 프리로드 목록에 포함**되어 있습니다. 즉 **모든 `.app` 주소는 HTTPS만 허용**되고 HTTP 접속 자체가 브라우저에서 차단됩니다.

- 모든 주소는 `https://`, WebSocket은 `wss://` 여야 합니다.
- **SSL 인증서가 준비되기 전에는 도메인이 아예 열리지 않습니다.** 인증서를 먼저 발급해야 테스트가 가능합니다.
- 딥링크 검증 파일도 반드시 HTTPS로 서빙되어야 합니다.

원칙: 한 번에 갈아엎지 않고 **구 도메인과 신 도메인을 병행**해 무중단으로 이관합니다. 앱 딥링크는 스토어 재배포가 필요하므로 다음 정기 배포에 얹습니다.

핵심 요약
- 코드 변경 자체는 적습니다(대부분 환경변수). 반나절 수준.
- 실제 비용은 앱 딥링크(스토어 재배포), 인프라(DNS·SSL·nginx), 콘솔 설정입니다.

---

## 1. 앱 (Flutter, cops-and-robbers-FE)

### 1-1. 환경변수 (쉬움, 재배포만)
- `.env`의 `API_BASE_URL` -> `https://api.copsandrobbers.app`
- `.env`의 `WS_URL` -> `wss://api.copsandrobbers.app/ws` (HTTPS 도메인이므로 wss 필수)
- 코드는 `lib/core/config/env_config.dart`, `lib/core/constants/api_endpoints.dart`에서 dotenv로 읽으므로 코드 수정 불필요.

### 1-2. 코드 (단일 소스)
- `lib/core/deeplink/deeplink_constants.dart` -> `host = 'copsandrobbers.app'`
  - **이 상수 하나만 바꾸면 됩니다.** 공유 링크(`share_util.dart`)와 QR 파서가 이 상수를 참조하므로 자동 반영됩니다. (share_util은 별도 수정 불필요)

### 1-3. 네이티브 딥링크 (무거움 - 스토어 재배포 필요)
빌드타임 설정이라 위 Dart 상수를 참조하지 못하므로 **수동으로 함께 바꿔야** 합니다.
- Android: `android/app/src/main/AndroidManifest.xml:68` -> `android:host="copsandrobbers.app"`
- iOS: `ios/Runner/Runner.entitlements:13` -> `applinks:copsandrobbers.app`
- 변경 시 앱 빌드 + 스토어 재심사가 필요합니다(iOS는 며칠). 가장 무거운 항목입니다.

### 1-5. 앱에서 안 건드리는 것 (확인 완료)
- 커스텀 스킴 `copsandrobbers://join`(AndroidManifest, iOS Info.plist) -> 앱 스킴이라 웹 도메인과 무관. 변경 불필요.
- `assets/legals/*.json`, LICENSE의 `copsnro66ers@gmail.com` -> 이메일이라 도메인 이전과 무관.
- Firebase 설정 파일(google-services / GoogleService-Info) -> 프로젝트 설정, 도메인 무관.
- (선택) `docs/DEEPLINK.md`, `.report/*.md`가 구 도메인을 참조 -> 기능엔 영향 없지만 문서 정합성을 위해 갱신 권장.

### 1-4. 딥링크 검증 파일 (신 도메인에 HTTPS 호스팅)
- Android: `https://copsandrobbers.app/.well-known/assetlinks.json`
- iOS: `https://copsandrobbers.app/.well-known/apple-app-site-association`
- 이 파일이 없으면 초대 링크로 앱 열기가 동작하지 않습니다.

---

## 2. 백엔드 (Spring, cops-and-robbers-BE)

### 2-1. 코드
- `common/config/WebConfig.java`의 **CORS allowedOrigins**를 신 도메인으로 (이관 중엔 구 도메인과 함께 추가)
  - `/graphql` 매핑 블록
  - `/api/auth/**` 매핑 블록
  - 추가할 값:
    ```
    https://copsandrobbers.app
    https://admin.copsandrobbers.app
    https://dev-api.copsandrobbers.app
    ```
- 안정화 후 구 도메인(`*.copsnro66ers.site`)을 제거합니다.

### 2-2. 배포·인프라
- 서버 주소·DB·Redis는 환경변수(`DB_URL`, `REDIS_HOST` 등)라 도메인과 무관.
- nginx `server_name`을 `api.copsandrobbers.app` / `dev-api.copsandrobbers.app`로, docker-compose의 호스트 설정이 있으면 갱신.

### 2-3. 안 건드리는 것
- 도커 이미지명 `copsnro66ers/cops-and-robbers` -> 도커 허브 네임스페이스라 웹 도메인과 무관.
- Firebase 서비스계정 -> 도메인 의존 없음.

---

## 3. 웹 (dongsim-web)

### 3-1. 환경변수
- `.env.local`의 `NEXT_PUBLIC_API_BASE_URL` -> 개발 `https://dev-api.copsandrobbers.app` / 운영 `https://api.copsandrobbers.app`
- `NEXT_PUBLIC_GRAPHQL_URL`을 쓰고 있다면 함께 갱신
- 코드는 `lib/relay/environment.ts`, `lib/admin/auth/session.ts`에서 env로 읽으므로 코드 수정 불필요.

### 3-2. 코드 (자기 도메인 - SEO·메타)
- `lib/constants.ts` -> `SITE_URL = "https://copsandrobbers.app"`
- `app/sitemap.ts` -> `BASE_URL`
- `app/robots.ts` -> `BASE_URL`
- `app/page.tsx` -> 구조화 데이터(JSON-LD)의 url 값 여러 곳
- README, docs의 링크는 선택(문서용).

### 3-3. 배포
- Vercel에 `copsandrobbers.app` 연결, 구 도메인 `copsnro66ers.site`는 리다이렉트로 유지.

---

## 4. 콘솔·외부 설정

- **Firebase Authentication -> 승인된 도메인**에 `copsandrobbers.app`, `admin.copsandrobbers.app` 추가. (localhost 유지)
- **Google Maps API 키 -> HTTP 리퍼러 제한**에 `https://copsandrobbers.app/*` 등 신 도메인 추가.
- Apple 소셜 로그인을 쓰면 **Service ID의 도메인·return URL**에 신 도메인 반영.
- 앱스토어·플레이스토어 리스팅의 **웹사이트 URL** -> `https://copsandrobbers.app`.
- 인스타 등 **소셜 프로필 링크** 갱신.

---

## 5. 인프라 (ops)

- **DNS 레코드**: `copsandrobbers.app`과 서브도메인(api, dev-api, admin, www) 추가.
- **SSL/TLS 인증서**: 신 도메인 발급(와일드카드 `*.copsandrobbers.app` 권장). **.app은 HTTPS 전용이라 인증서가 없으면 접속 자체가 안 됩니다.**
- **nginx/리버스 프록시**: `server_name` 갱신.
- **구 도메인 -> 신 도메인 301 리다이렉트**로 무중단·SEO 보존.

---

## 6. 권장 이관 순서 (무중단)

1. `copsandrobbers.app` DNS·SSL 준비 (SSL 먼저, .app은 HTTPS 없으면 안 열림), 서브도메인 세팅
2. 백엔드 CORS·nginx에 신 도메인 **추가**(구 도메인 유지)
3. Firebase 승인 도메인·Maps 리퍼러에 신 도메인 추가
4. 웹 env·상수를 신 도메인으로 변경 후 배포(구 도메인은 리다이렉트)
5. 앱 env(API·WS) + 딥링크 상수·네이티브 설정 + 검증 파일 준비 -> **다음 정기 배포로 스토어 반영**
6. 안정화 후 구 도메인은 리다이렉트만 남기고 정리

---

## 7. 검증 체크리스트

- [ ] `https://copsandrobbers.app` 접속·로그인·GraphQL 조회
- [ ] `https://admin.copsandrobbers.app` 어드민 로그인·조회
- [ ] 앱 로그인·게임 진행·WebSocket(wss) 연결
- [ ] 초대 링크(`https://copsandrobbers.app/join/...`)로 앱 열림 (Android·iOS 각각)
- [ ] 공유 링크 정상 생성·열림
- [ ] 구 도메인 접속 시 신 도메인으로 301 리다이렉트

---

## 8. 변경 파일 요약

| 레포 | 파일·위치 | 변경 | 공수 |
| --- | --- | --- | --- |
| 앱 | `.env` (API_BASE_URL, WS_URL) | https/wss 신 주소 | 쉬움 |
| 앱 | `lib/core/deeplink/deeplink_constants.dart` | host -> copsandrobbers.app (share_util·QR 자동 반영) | 쉬움 |
| 앱 | `AndroidManifest.xml:68`, `Runner.entitlements:13` | 딥링크 도메인 | 무거움(재배포) |
| 앱 | 신 도메인 `assetlinks.json`, `apple-app-site-association` | HTTPS 호스팅 | 중간 |
| BE | `common/config/WebConfig.java` | CORS origins(2블록) | 쉬움 |
| BE | nginx/docker 호스트 설정 | server_name 등 | 중간(ops) |
| 웹 | `.env.local` (NEXT_PUBLIC_API_BASE_URL 등) | 신 주소 | 쉬움 |
| 웹 | `lib/constants.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/page.tsx` | 자기 도메인 | 쉬움 |
| 콘솔 | Firebase 승인 도메인, Maps 리퍼러 | 신 도메인 추가 | 쉬움 |
| 인프라 | DNS, SSL(와일드카드), nginx, 301 리다이렉트 | 신 도메인 | 중간(ops) |
