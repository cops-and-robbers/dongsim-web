# 지표 수집 (개발자용)

마케팅, 스토어, 광고 숫자를 매일 Supabase 에 모으는 장치 (#140, #142, #143).
인스타그램 리포트(디스코드 메시지)는 [instagram-report.md](instagram-report.md) 에 따로 있다.

## 왜 직접 모으나

숫자가 네 콘솔(인스타, App Store Connect, GA4, AdMob)에 흩어져 있고, 콘솔마다 기록이 지워진다.
App Store 분석 리포트 파일은 35일, 판매 리포트는 1년, 인스타 계정 지표는 30일이 지나면 다시 받을 수 없다.
매일 받아 우리 DB 에 쌓으면 1년 뒤에도 "작년 같은 행사 때"와 견줄 수 있고, 화면은 콘솔을 부르지 않고 이 테이블만 읽는다.

## 데이터 흐름

```
GitHub Actions
  instagram-report.yml  매일 UTC 0:17  → /api/metrics/instagram  (디스코드 리포트까지)
  metrics-collect.yml   매일 UTC 20:43 → /api/metrics/appstore
                                       → /api/metrics/ga4
                                       → /api/metrics/admob
```

소스마다 라우트를 나눈 이유: 한 소스가 실패해도 나머지는 저장되고, 각 호출이 Vercel 300초 한도 안에 든다.
모든 라우트는 같은 시크릿(`METRICS_CRON_SECRET`)을 헤더로만 받는다(`lib/metrics/cron.ts`).
`?dry=1` 은 받아서 세기만 하고, `?from=YYYY-MM-DD` 는 그날부터 다시 채운다(GA4, AdMob 은 `all` 도 받는다).

## 소스별로 알아 둘 것

| 소스 | 테이블 | 하루 기준 | 다시 받는 범위 | 함정 |
| --- | --- | --- | --- | --- |
| App Store 판매 | `appstore_sales_daily` | 미국 서부 | 최근 7일 | 판매가 없는 날은 404 "no sales" - 오류가 아니다. 1년 보관 |
| App Store 분석 | `appstore_analytics_daily` | UTC | 새 인스턴스만 | 같은 날짜가 여러 파일(처리일)에 나온다. 가장 최근 처리일만 남긴다. 5명 미만 칸은 애플이 뺀다 |
| GA4 | `ga4_daily` | 속성 시간대 | 최근 7일 | 세로로 길게 저장. `totalUsers` 는 날짜끼리 더하면 안 된다(같은 사람을 여러 번 센다) |
| AdMob | `admob_daily` | Asia/Seoul | 최근 7일 | 서비스 계정 불가, 사람 계정 갱신 토큰. 매치율, 노출률은 저장하지 않고 요청 수에서 계산 |

**App Store 판매 상품 유형(`product_type`)**: `1`, `1F`, `1T` 신규 다운로드 / `3`, `3F` 재다운로드 / `7`, `7F`, `7T` 업데이트.

**App Store 분석 리포트**는 Standard 두 개만 쓴다(`appstore/analytics.ts` 의 `WANTED_REPORTS`).
열 이름을 미리 정하지 않고 머리줄을 읽어, 숫자(`Counts`, `Unique Counts`) 외의 열은 `dims`(jsonb)에 그대로 둔다.
상시 수집(ONGOING, 2026-10-05)과 전체 기록(ONE_TIME_SNAPSHOT, 2026-10-06) 요청을 둘 다 읽는다.
한 번 처리한 인스턴스는 `appstore_analytics_instances` 에 남겨 다시 받지 않는다.

**GA4 에서 받는 것**(`ga4/run.ts` 의 `QUERIES`)

축이 여럿이면 값을 `|` 로 이어 key 한 칸에 담는다(`KEY_SEP`). 캠페인 이름이나 소스에 `/` 가 들어갈 수 있어서 `/` 는 쓰지 않는다. 나눌 때는 `splitKey()` 를 쓴다.

| 속성 | breakdown | key | 무엇에 쓰나 |
| --- | --- | --- | --- |
| web | `total` | (빈 값) | 활성 사용자, 신규, 세션 |
| web | `session_campaign` | `출처\|매체\|캠페인\|버튼` | 링크트리, 행사 QR 의 UTM |
| web | `event` | 이벤트 이름 | `app_download_click` 등 |
| web | `download_source` | `출처\|매체\|캠페인` | `app_download_click` 만, 그 클릭이 나온 방문의 경로. "인스타에서 온 사람이 버튼까지 눌렀나"를 센다 |
| app | `platform` | Android, iOS | 활성 사용자, 신규, 세션 |
| app | `event` | `이벤트\|플랫폼` | `first_open`, `login`, `game_start`, `game_over`, `app_remove` 등 |
| app | `first_user_campaign` | `출처\|매체\|캠페인\|플랫폼` | `/download` 가 Play 로 넘긴 referrer(#144)로 들어온 첫 실행 |

## 환경변수

| 이름 | 어디에 | 값 |
| --- | --- | --- |
| `METRICS_CRON_SECRET` | Vercel, GitHub 시크릿 | #140 에서 넣은 값 그대로 |
| `ASC_ISSUER_ID` | Vercel | App Store Connect > 통합 > 팀 키 화면 위쪽 Issuer ID |
| `ASC_KEY_ID` | Vercel | 수집용 팀 키(판매, 보고서 액세스)의 키 ID |
| `ASC_PRIVATE_KEY` | Vercel | 그 키의 `.p8` 파일 내용 전체 (여러 줄 그대로) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Vercel | 서비스 계정 `metrics-collector` 의 JSON 키 파일 내용 전체 |
| `ADMOB_CLIENT_ID`, `ADMOB_CLIENT_SECRET` | Vercel | OAuth 클라이언트 JSON(`installed`)의 두 값 |
| `ADMOB_REFRESH_TOKEN` | Vercel | 팀 계정이 허락해 받은 갱신 토큰 |

비밀이 아닌 식별자(앱 ID, Vendor 번호, GA4 속성 ID, AdMob 퍼블리셔 ID, 처음 채울 날짜)는 `lib/metrics/config.ts` 에 있다.

## 처음 켜기

1. Supabase SQL 편집기에서 `supabase/migrations/0003_store_ads_metrics.sql` 실행
2. 로컬에서 처음부터 채운다 (300초 한도 때문에 라우트 대신 스크립트로)
   ```bash
   node --env-file=.env.local scripts/metrics-collect.mjs appstore --from all
   node --env-file=.env.local scripts/metrics-collect.mjs ga4 --from all
   node --env-file=.env.local scripts/metrics-collect.mjs admob --from all
   ```
3. Vercel 환경변수를 넣고 배포한 뒤 Actions > metrics-collect > Run workflow

`--dry` 를 붙이면 저장하지 않고 센다. Node 22.18 이상이 필요하다(.ts 를 그대로 실행).

## AdMob 다시 허락하기

갱신 토큰은 팀 계정 비밀번호를 바꾸거나, 구글 계정 설정에서 앱(dongsim-metrics) 허락을 취소하면 끊긴다.
그때 수집이 `invalid_grant` 로 실패한다. 구글 클라우드 `dongsim-analytics` 의 OAuth 클라이언트로
다시 로그인해 새 갱신 토큰을 받아 `ADMOB_REFRESH_TOKEN` 을 바꾼다. OAuth 동의 화면이 **프로덕션**이어야 한다 -
테스트 상태면 갱신 토큰이 7일마다 만료된다.

## 주간 리포트 (#146)

매주 월요일 한국 오전 9시 37분(`weekly-report.yml` → `/api/metrics/weekly`), 지난주 월~일을 그 전주와 견줘 디스코드로 한 번 보낸다.
수집은 하지 않고 위 테이블을 읽는다(`lib/metrics/weekly/`). 인스타 리포트와 같은 웹후크를 쓰고 봇 이름만 "주간 리포트"로 바꾼다.
같은 주는 `metrics_notifications`(kind `weekly_report`, key 주 시작일)로 한 번만 보낸다.

**더해도 되는 숫자만 쓴다.** 하루 도달, 하루 사용자는 같은 사람을 여러 날 세서 일주일로 더하면 부풀려진다.
그래서 인스타는 조회, 프로필 방문, 링크 클릭을, 앱은 이벤트 횟수(`first_open`, `game_start`)를, 웹은 세션과 다운로드 버튼 클릭 횟수를 더한다.
"앱 첫 실행 횟수"는 Android 와 iOS 의 `first_open` 을 더한 값이다. 앱을 지웠다 다시 깔면 또 세므로 사람 수(명)로 쓰지 않는다.

**한 주는 한국 날짜 월~일이다.** 인스타 계정 지표와 App Store 판매는 미국 서부(PT) 날짜로 오는데,
PT 하루는 한국 그날 오후 4~5시부터 다음 날 같은 시각까지라 대부분 다음 날과 겹친다.
그래서 PT 날짜는 하루 뒤로 옮겨(`shiftPt`) 한국 주에 넣는다. 옮기지 않으면 월요일 아침에는
PT 일요일 숫자가 아직 없어 한 주가 6일로 잘리고, 7일인 전주와 견주게 된다.

인스타에서 온 웹 방문은 출처가 instagram 이거나 linktr.ee 인 세션이다(`FROM_INSTAGRAM`). 링크트리는 인스타 프로필에만 걸려 있다.

비교는 전주 값을 괄호에 그대로 적는다. 작은 숫자에서 "2배"나 "%" 로 바꾸면 과장되기 때문이다.

## 아직 남은 것

- App Store 분석 리포트 첫 파일이 나오면 실제 열을 보고 화면에서 쓸 축을 정한다
- 전체 기록(ONE_TIME_SNAPSHOT) 파일을 받으면 일회용 관리자 키(analytics-setup)를 폐기한다
- Play 설치 통계(#147)는 권한 반영을 기다린다
