# 어드민 웹 애플 로그인 설정

앱에서는 되는데 어드민 웹에서만 애플 로그인이 안 될 때, 또는 키를 재발급할 때 여기를 본다.

**핵심:** 앱(iOS 네이티브)은 App ID 하나로 동작하지만, **웹은 Services ID와 개인키(.p8)가 따로 필요하다.**
앱만 세팅한 상태면 웹은 무조건 실패한다. 같은 애플 로그인이라도 설정이 별개다.

## 우리 값

| 항목 | 값 |
| --- | --- |
| Apple 팀 ID | `5FZ789N4RT` |
| App ID (앱용) | `com.elipair.copsandrobbers` |
| Services ID (웹용) | `app.copsandrobbers.web` |
| Firebase 프로젝트 | `copsandrobbers-8c026` |
| Apple에 등록할 도메인 | `copsandrobbers-8c026.firebaseapp.com` |
| Return URL | `https://copsandrobbers-8c026.firebaseapp.com/__/auth/handler` |

> 도메인 칸에 `admin.copsandrobbers.app`을 넣지 않는다. 로그인 팝업이 실제로 뜨는 곳은
> Firebase 인증 핸들러라서 `firebaseapp.com`을 등록해야 한다. 가장 흔한 실수다.

## 설정 순서

### 1. App ID 확인

Apple Developer → Identifiers → 필터 `App IDs` → `com.elipair.copsandrobbers`

Capabilities에 **Sign In with Apple**이 켜져 있는지만 확인한다. 앱이 동작 중이면 이미 켜져 있다.

### 2. Services ID 생성

Identifiers → `+` → **Services IDs**

| 칸 | 값 |
| --- | --- |
| Description | `Cops and Robbers Web` |
| Identifier | `app.copsandrobbers.web` |

identifier는 등록 후 **수정할 수 없다.** 지우고 다시 만들어야 하니 오타를 확인하고 Register.

### 3. Services ID에 도메인·Return URL 등록

만든 Services ID를 클릭 → **Sign In with Apple** 체크 → 옆의 **Configure**

| 칸 | 값 |
| --- | --- |
| Primary App ID | `com.elipair.copsandrobbers` |
| Domains and Subdomains | `copsandrobbers-8c026.firebaseapp.com` |
| Return URLs | `https://copsandrobbers-8c026.firebaseapp.com/__/auth/handler` |

- 도메인에 `https://`나 끝의 `/`를 넣지 않는다
- Return URL의 `__`는 언더바 **2개**다
- 애플이 도메인 확인 파일(`apple-developer-domain-association.txt`)을 요구해도 무시한다.
  그 도메인은 구글 소유라 우리가 파일을 올릴 수 없고, 애플 웹 로그인은 Return URL 일치로 검증한다
- **바깥쪽 Save까지 눌러야 저장된다.** 안쪽 팝업만 닫으면 반영되지 않는다

### 4. 개인키(.p8) 발급

Keys → `+` → Key Name 입력 → **Sign in with Apple** 체크 → **Configure** → Primary App ID 선택 → Save
→ Continue → Register → **Download**

- **`.p8`은 한 번만 받을 수 있다.** 잃어버리면 키를 폐기하고 새로 발급해야 한다. 팀 비밀 저장소에 보관
- **Key ID**는 파일명 `AuthKey_XXXXXXXXXX.p8`의 뒤 10자리다

### 5. Firebase 콘솔에 등록

Firebase 콘솔 → `copsandrobbers-8c026` → Authentication → Sign-in method → **Apple**

| 칸 | 값 |
| --- | --- |
| 서비스 ID | `app.copsandrobbers.web` |
| Apple 팀 ID | `5FZ789N4RT` |
| 키 ID | 4번에서 받은 10자리 |
| 비공개 키 | `.p8` 내용 전체 |

- 팀 ID·키 ID·비공개 키는 **`OAuth 코드 흐름 구성` 섹션을 펼쳐야** 나온다.
  칸 이름에 "(선택사항)", "(Apple에는 필요하지 않음)"이라고 적혀 있지만 **웹 로그인에는 전부 필수다.**
  iOS 네이티브 기준의 안내라서 그렇다
- 비공개 키는 `-----BEGIN PRIVATE KEY-----`부터 `-----END PRIVATE KEY-----`까지 전부 붙여넣는다

저장하면 즉시 반영된다. **재배포 불필요.**

## 설정이 끝나도 로그인이 안 되는 경우

백엔드는 `(Firebase UID, APPLE)` 조합으로 관리자를 찾는다. 그런데 **Firebase UID는 로그인 수단마다 다르다.**
구글로 가입한 관리자가 애플로 로그인하면 UID가 달라서 조회에 실패한다.

애플로 어드민에 들어가려면:

1. 그 애플 계정으로 **앱에서 회원가입**
2. 백엔드에서 그 유저에게 **ADMIN 권한 부여**
3. 어드민에서 애플 로그인

애플의 "이메일 가리기"를 쓰면 릴레이 주소(`...@privaterelay.appleid.com`)로 가입된다.
구글 계정과 이메일이 달라 완전히 별개 유저가 되므로, 관리자 계정을 찾을 때 혼동하지 않는다.

## 에러별 원인

| 화면에 뜨는 것 | 원인 |
| --- | --- |
| `invalid_client` (애플 화면) | Firebase의 서비스 ID와 Apple의 identifier 불일치, 또는 3번 바깥쪽 Save 누락 |
| `invalid_redirect_uri` (애플 화면) | Return URL 오타. 언더바 2개(`__`) 확인 |
| `auth/operation-not-allowed` | Firebase에서 Apple provider가 저장되지 않음 |
| `auth/unauthorized-domain` | Firebase 승인된 도메인에 접속 도메인이 없음 |
| `가입되지 않은 사용자입니다` | **설정은 성공.** 위 계정 문제만 남은 상태 |

마지막 줄은 애플 인증까지 통과했다는 뜻이라 오히려 좋은 신호다.

## 참고

- 승인된 도메인(Firebase → Authentication → Settings)에 접속 도메인이 있어야 한다.
  현재 `admin.copsandrobbers.app` 등록되어 있음
- 프론트 구현은 `lib/firebase.ts`(지연 초기화)와 `lib/admin/auth/login.ts`(`OAuthProvider("apple.com")`)에 있다.
  구글과 완전히 같은 경로이며, 둘 다 Firebase idToken을 백엔드로 보낸다
