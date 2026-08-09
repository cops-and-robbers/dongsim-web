# 어드민 GA(Google Analytics) 지표 연동 설계

어드민 "분석" 페이지에 앱/웹 사용 지표(DAU, WAU, MAU, 리텐션, 인기 이벤트, 플랫폼 분포)를 한눈에 보여주기 위한 설계 문서입니다.
프론트는 이미 `adminAnalytics` 쿼리와 분석 페이지 UI를 갖추고 있어, 백엔드가 계약대로 구현하면 그대로 붙습니다.

- 관련 문서: [어드민 GraphQL + Relay 구축 가이드](admin-graphql-relay.md)
- 계약 원본: `schema.graphql`의 `AdminAnalytics` 타입

---

## 1. 핵심 원칙

GA4 데이터는 **백엔드가 서비스 계정으로 읽어서 `adminAnalytics` GraphQL 쿼리로 내려줍니다.**
브라우저에서 GA4 Data API를 직접 호출하는 방식은 쓰지 않습니다.

이유는 세 가지입니다.

| 이유 | 설명 |
| --- | --- |
| 인증 | GA4 Data API는 서비스 계정 키(비공개)가 필요합니다. 브라우저에 키를 두면 노출됩니다. |
| 쿼터 | GA4 Data API는 속성별 요청 쿼터가 있습니다. 서버에서 캐싱하며 호출해야 안전합니다. |
| 일관성 | 어드민의 다른 데이터(유저/게임)와 같은 `/graphql` 한 곳에서 받으면 클라이언트가 단순해집니다. |

---

## 2. 두 개의 계층으로 나눠서 봅니다

GA는 "데이터를 쌓는 일"과 "쌓인 데이터를 보여주는 일"이 분리됩니다.

### 2-1. 수집(트래킹) - 백엔드 수정 없음

| 대상 | 방법 |
| --- | --- |
| 웹(Next.js) | GA4 측정 ID로 `gtag` 삽입. `@next/third-parties`의 `GoogleAnalytics` 컴포넌트 권장 |
| 앱(Flutter) | Firebase Analytics SDK |

웹 스트림과 앱 스트림을 **하나의 GA4 속성** 아래 두면, 플랫폼 분포(web/iOS/Android)가 자연스럽게 한 곳에 모입니다.
이 단계는 프론트/앱 작업이고 백엔드 수정은 없습니다.

### 2-2. 표시(조회) - 백엔드 작업 필요

수집된 데이터를 어드민에서 보여주는 부분입니다. 백엔드가 GA4 Data API를 호출해 `adminAnalytics`로 반환합니다.

```
[GA4 속성] --runReport--> [백엔드 GA4 Data API 클라이언트] --캐시--> [adminAnalytics 리졸버]
                                                                          |
                                                                     /graphql
                                                                          |
                                                            [어드민 분석 페이지 (Relay)]
```

---

## 3. 백엔드 작업 목록

| # | 항목 | 내용 |
| --- | --- | --- |
| 1 | 의존성 | `com.google.analytics:google-analytics-data` |
| 2 | 시크릿 | GA4 **속성 ID(property id)** + **서비스 계정 JSON 키**. 서비스 계정을 GA4 속성에 "뷰어" 권한으로 추가 |
| 3 | 스키마 | `schema.graphqls`에 `adminAnalytics` 쿼리와 타입 추가. 프론트 `schema.graphql`의 `AdminAnalytics`, `AnalyticsPoint`, `EventCount`, `PlatformCount`를 그대로 쓰면 계약이 일치합니다 |
| 4 | 리졸버 | GA4 Data API `runReport` 호출 결과를 타입에 매핑(아래 4절 표) |
| 5 | 캐싱 | Redis에 지표 캐시(권장 10-30분). 하루 단위 지표라 실시간일 필요가 없습니다 |

시크릿(속성 ID, 서비스 계정 키)은 코드에 넣지 않고 환경변수/시크릿 매니저로 주입합니다.

---

## 4. `adminAnalytics` 필드 - GA4 매핑

프론트가 요구하는 필드와, 백엔드가 GA4 Data API에서 뽑을 지표/차원의 대응입니다.

| GraphQL 필드 | GA4 지표/차원 | 비고 |
| --- | --- | --- |
| `dau` | `active1DayUsers` | 당일 활성 |
| `wau` | `active7DayUsers` | 7일 활성 |
| `mau` | `active28DayUsers` | 28일 활성 |
| `newUsers` | `newUsers` | 신규 |
| `dauGrowthRate` | `active1DayUsers` 전주 대비 계산 | 백엔드에서 % 계산 |
| `avgEngagementSeconds` | `userEngagementDuration` / `activeUsers` | 평균 참여 시간(초) |
| `retentionD1` / `retentionD7` | `cohortSpec` + `cohortActiveUsers` / `cohortTotalUsers` | 코호트 리포트. 계산이 복잡해 2차로 미뤄도 됨 |
| `dauTrend` | `date` 차원별 `active1DayUsers` (최근 14일) | `AnalyticsPoint` 배열 |
| `topEvents` | `eventName` 차원별 `eventCount` (상위 N) | `EventCount` 배열 |
| `platformBreakdown` | `platform` 차원별 `activeUsers` | `PlatformCount` 배열. `platform` 값은 web/iOS/Android |

`platformBreakdown.platform`은 현재 계약이 `DeviceType(IOS/ANDROID)` 기준입니다. GA4 `platform` 차원은 web도 포함하므로,
web을 함께 보여주려면 계약에 web을 추가할지 백엔드와 합의가 필요합니다.

---

## 5. 커스텀 이벤트 네이밍 합의

`topEvents`가 의미를 가지려면 웹/앱이 **같은 이름의 커스텀 이벤트**를 심어야 합니다.
예시(확정 전 초안)이며, FE/앱/백엔드가 한 번 맞춰야 합니다.

| 이벤트 이름 | 시점 |
| --- | --- |
| `game_created` | 방 생성 |
| `game_joined` | 방 참여 |
| `game_started` | 게임 시작 |
| `arrest` | 도둑 체포 |
| `game_finished` | 게임 종료 |

---

## 6. 단계적 도입

GA 연동이 늦어질 경우를 대비한 순서입니다.

1. **1차(빠른 시작)**: 백엔드가 자체 DB 기반 근사 지표(로그인 로그 기반 DAU, 게임 세션 수)를 `adminStats`로 먼저 제공합니다. GA 없이도 개요는 채워집니다.
2. **2차**: GA4 수집(gtag, Firebase Analytics)을 붙여 데이터를 쌓습니다.
3. **3차**: `adminAnalytics` 리졸버로 GA4 정밀 지표(리텐션, 이벤트, 플랫폼)를 제공합니다.

GA4 대시보드를 iframe으로 임베드하는 방식은 별도 로그인이 필요하고 디자인이 맞지 않아 권장하지 않습니다.

---

## 7. 프론트 현황

이미 준비되어 있어 백엔드 구현만 기다리는 상태입니다.

| 항목 | 위치 |
| --- | --- |
| 쿼리 | `lib/admin/gql/AdminAnalytics.ts` |
| 계약 타입 | `schema.graphql`의 `AdminAnalytics` 외 |
| 분석 페이지 UI | `app/admin/analytics/page.tsx` |
| 목 데이터 | `lib/admin-mock/data.ts` (현재는 MSW 목으로만 동작) |

즉 백엔드가 `adminAnalytics`를 계약대로 구현하면, 프론트는 `GRAPHQL_ENDPOINT`만 실제 서버로 바꾸면 붙습니다.
