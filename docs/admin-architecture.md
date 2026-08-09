# 어드민 아키텍처 노트

경찰과 도둑 웹사이트의 관리자(admin) 화면을 어떻게 짰는지, 특히 **왜 GraphQL을 골랐고 지금 우리 상황에 왜 잘 맞는지** 남겨요.

## 한 줄 요약

관리자 데이터는 GraphQL(Relay)로, 공지만 REST로 받아요. 백엔드 계약(스키마)을 먼저 맞추고, 아직 배포 안 된 건 목(MSW)으로 가로채서 프론트를 먼저 완성하는 방식이에요.

## 왜 GraphQL이었나

관리자 화면은 화면마다 필요한 데이터 모양이 너무 달라요.

- 유저 목록은 요약 몇 개(닉네임·가입일·상태)만 필요해요.
- 유저 상세는 전체 필드가 필요해요.
- 대시보드는 여러 집계를 한 번에 가져와야 해요.

이걸 REST로 하면 화면마다 엔드포인트가 늘거나, 한 엔드포인트를 여러 화면이 쓰면서 오버페칭이 생겨요. GraphQL은 화면이 "필요한 필드만" 정확히 요청하니까 이 문제가 없어요.

거기다 백엔드도 관리자 쿼리를 GraphQL로 제공해요(`adminUsers`, `adminGames`, `adminDashboard`, `adminReports`, `adminBugReports` 등). 스키마가 타입으로 딱 고정되니까 FE/BE가 "이 필드 있다/없다"를 문서가 아니라 타입으로 합의해요.

## Relay를 얹은 이유

그냥 `fetch`로 GraphQL을 쏠 수도 있는데 Relay를 얹었어요.

- **컴파일 타임 타입 안전** - `relay-compiler`가 쿼리를 읽어서 타입을 자동 생성해요. 필드 오타나 백엔드와의 불일치가 빌드에서 걸려요. (실제로 백엔드엔 없는 `resolvedBy` 필드를 우리가 쓰고 있던 걸 이 방식으로 잡았어요.)
- **노드 단위 스토어 갱신** - 뮤테이션이 바꾼 노드(id 기준)를 돌려주면 스토어가 알아서 갱신해요. 신고·버그 상태를 바꾸면 목록이 새로고침 없이 자동으로 반영돼요. 그래서 상태 변경 뮤테이션은 `{ id, status, adminMemo }`만 돌려받아요.

## 지금 구조에 왜 잘 맞나 (목 우선 → 실서버 전환)

백엔드가 아직 다 배포되지 않아도 프론트를 먼저 완성할 수 있게 짰어요.

- `lib/relay/environment.ts`에서 오퍼레이션 이름을 보고 목/실서버를 골라요.
- 아직 배포 안 된 쿼리는 `MOCK_ONLY`에 넣어두면 MSW 목(`/graphql`)이 가로채요.
- 백엔드가 배포되면 그 이름을 `MOCK_ONLY`에서 빼기만 하면 실서버로 붙어요. (대시보드·신고·버그가 이렇게 실데이터로 전환됐어요.)

이 덕분에 백엔드 진행 속도와 독립적으로 화면을 먼저 만들고, 계약이 맞는지도 미리 검증할 수 있었어요.

## GraphQL과 REST를 같이 쓰는 이유

공지(공지사항)만 백엔드가 REST(`/api/notices`)로 내줘서 거기만 REST 클라이언트(`lib/admin/notices/api.ts`)로 붙였어요. 데이터 계층은 둘로 나뉘지만, 인증(Bearer 토큰)·401 재발급은 두 계층이 같은 걸 공유해요.

## 인증 흐름

소셜 로그인(구글·애플)을 Firebase로 받고, Firebase idToken을 백엔드 관리자 로그인에 넘겨서 우리 JWT(access·refresh)를 받아요.

- 모든 요청에 `Authorization: Bearer <access>`를 실어요.
- access가 만료(401)되면 refresh로 한 번 재발급하고 재시도해요. (`lib/admin/auth/session.ts`)
- 응답의 토큰은 `tokens` 안에 중첩돼 있어서 `res.tokens.accessToken`으로 읽어요.

## 폴더 지도

- `lib/admin/gql/` - Relay 쿼리·뮤테이션 정의
- `lib/relay/environment.ts` - 네트워크 계층, 목/실서버 라우팅
- `lib/admin/auth/` - 로그인·토큰·세션
- `lib/admin/notices/api.ts` - 공지 REST 클라이언트
- `lib/admin-mock/` - MSW 핸들러 + 목 데이터셋 (백엔드 다 붙으면 삭제)
- `__generated__/` - `relay-compiler` 생성물 (직접 수정하지 않아요)
- `schema.graphql` - 로컬 스키마(계약). 백엔드 스키마와 맞춰요.

## 백엔드가 다 붙은 뒤 정리할 것

- 배포 완료된 오퍼레이션을 `MOCK_ONLY`에서 제거해요.
- 실데이터로 안정화되면 `lib/admin-mock/`을 삭제해요.
