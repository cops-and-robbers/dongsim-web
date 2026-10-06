# 지표 수집 (개발자용)

마케팅, 스토어, 광고 숫자를 매일 Supabase 에 모으는 장치 (#140, #142, #143).
인스타그램 리포트(디스코드 메시지)는 [instagram-report.md](instagram-report.md) 에 따로 있다.

## 왜 직접 모으나

숫자가 네 콘솔(인스타, App Store Connect, GA4, AdMob)에 흩어져 있고, 콘솔마다 기록이 지워진다.
App Store 분석 리포트 파일은 35일, 판매 리포트는 1년, 인스타 계정 지표는 30일이 지나면 다시 받을 수 없다.
매일 받아 우리 DB 에 쌓으면 1년 뒤에도 "작년 같은 행사 때"와 비교할 수 있고, 화면은 콘솔을 부르지 않고 이 테이블만 읽는다.

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
| App Store 판매 | `appstore_sales_daily` | 한국 날짜와 맞음(실측, #154) | 최근 7일 | 판매가 없는 날은 404 "no sales" - 오류가 아니다. 아직 안 나온 날은 404 "not available yet" - 최근 이틀이면 기다린다. 1년 보관 |
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
| web | `download_source` | `출처\|매체\|캠페인` | `app_download_click` 만. `eventCount` 는 스토어로 넘긴 횟수, `sessions` 는 그 기록이 있는 방문 수(전환율 분자, 한 방문 여러 번 눌러도 한 번) |
| web | `download_page` | 페이지 경로 | `app_download_click` 을 페이지별로. `/download` 는 QR, 링크트리 다운로드 링크가 가리키는 자동 이동 페이지라 사이트 버튼과 가른다 |
| app | `retention` | 며칠 뒤(0, 1, 7) | 처음 들어온 날(day)이 같은 사람 중 n 일 뒤 다시 온 사람(`cohortActiveUsers`). 0 은 그날 처음 온 사람 수. 테스트 기기는 뺀다(#157). 익은 칸만, 0 도 저장(`ga4/cohorts.ts`) |
| app | `funnel` | `단계\|플랫폼\|나라` | 신규 사용자 퍼널(#157). 처음 들어온 날(day)부터 7일 안에 단계(open, login, room, play)까지 간 사람(`users`). replay 는 8~14일째에 다시 게임한 사람. 7일 창이 닫힌 날만, 나라는 countryId(`funnel.ts`) |
| app | `activation` | (빈 값) | 예전 활성화(game_start 만, 모든 나라). #157 부터 수집하지 않고 퍼널로 바꿨다. 남은 줄은 읽지 않는다 |
| app | `first_open_country` | `플랫폼\|나라` | 앱 첫 실행 횟수를 나라(countryId)별로, 테스트 기기는 뺀다(#157). 화면과 주간 리포트의 첫 실행은 이 줄로 센다 |
| app | `first_open_test` | 플랫폼 | 테스트 기기로 보여 뺀 첫 실행 횟수. 화면과 리포트가 "n회는 뺐어요"로 밝힌다 |
| app | `platform` | Android, iOS | 활성 사용자, 신규, 세션 |
| app | `event` | `이벤트\|플랫폼` | `first_open`, `login`, `game_start`, `game_over`, `app_remove` 등 |
| app | `first_user_campaign` | `출처\|매체\|캠페인\|플랫폼` | `/download` 가 Play 로 넘긴 referrer(#144)로 들어온 첫 실행 |

### 숫자를 셀 때 걸리는 함정

2026-10-06 에 화면 숫자를 원본 API 와 하나씩 대조하다 찾은 것들이다.

- **`app_download_click` 은 버튼 클릭만이 아니다.** `/download`(QR, 링크트리 다운로드 링크)는 열리자마자 스토어로 넘기며 같은 이벤트를 남긴다. 4주 99회 중 79회가 `/download` 였다. 그래서 화면과 리포트는 "다운로드 버튼 클릭"이 아니라 "스토어로 이동"이라고 쓰고, 링크 몫(`download_page`)을 따로 보여 준다.
- **전환율 분자는 방문 수다.** 한 방문에서 여러 번 누르면 클릭 수가 방문 수보다 커져 전환율이 100% 를 넘을 수 있다(다른 SNS 채널이 방문 11, 클릭 12 였다). `download_source` 의 `sessions` 를 쓴다.
- **사이트 전환율에서 `/download` 방문을 뺀다.** `/download` 로 들어온 방문은 들어오는 순간 스토어로 넘어가 무조건 "전환"이 된다. 분자와 분모에서 모두 빼면(`download_page` 의 `/download` 방문 수) 4주 사이트 전환율이 19.6% 에서 3.8%(369 방문 중 14) 로 바로잡혔다.
- **GA4 사이트와 앱은 시작일이 다르다.** 사이트는 4월, 앱은 6월부터다. 하나로 보면 6월 전 앱 숫자가 0 으로 읽혀 13주 보기의 이전 기간 비교가 부풀려진다. 화면은 `ga4web`, `ga4app` 을 따로 본다.
- **판매가 없는 날도 표시를 남긴다.** App Store 판매가 0 인 날은 줄이 없어 "아직 안 받음"과 구분이 안 된다. 상품 유형이 빈 0 줄을 남긴다(`appstore/run.ts withMarker`).
- **게임 이벤트는 사람 기준이다.** `game_start`, `game_over` 는 참가자 폰마다 찍힌다(5명이 한 판 하면 5). 실제 판 수는 백엔드 게임 기록에만 있어 어드민 화면이 어드민 토큰으로 읽는다(`dashboard/games.ts`). 크론에는 어드민 토큰이 없어 주간 리포트는 "게임 참가(사람 기준)"로 쓴다.
- **우리 팀 방문을 뺀다.** localhost, vercel.com, *.vercel.app, github.com, tagassistant 출처는 개발 중 우리 방문이다(4주 28회). 모든 방문, 전환, 채널 합계에서 뺀다(`channels.ts isInternal`). 앞으로는 GA4 관리 > 데이터 스트림 > 태그 설정 > 내부 트래픽 정의로 막는 게 정석이다.
- **인스타 판별에 `ig` 를 넣는다.** 인스타가 프로필 링크에 스스로 `utm_source=ig` 를 붙인다(`channels.ts fromInstagram`).
- **비율은 하루 합으로 못 낸다.** 같은 사람이 여러 날 오면 여러 번 세진다. 활성화율과 리텐션은 처음 들어온 날로 묶어(코호트) GA4 에 따로 묻는다(`ga4/cohorts.ts`). 2026-10-06 에 4주 코호트 합 342명이 신규 사용자, first_open 사용자와 똑같이 맞았다.
- **삭제와 알림 닫기는 Android 만 찍힌다.** 비율도 Android 끼리 낸다.
- **구글 플레이 자동 테스트 기기가 첫 실행에 섞인다(#157).** 새 버전을 올릴 때마다 출시 전 보고서가 기기 몇 대로 앱을 연다. 국가 미상, 기기 정보 없음, Android 11 로 잡히고
  버전마다 2~7명씩, 방에 들어간 적은 0번이다. 2026-09 안드로이드 첫 실행의 3분의 2였다. 처음엔 한국과 일본만 세서 피했는데 진짜 해외 사용자(인도 4명 중 3명이 게임)까지 빠져, 기기 특징으로 뺀다(`testDevices.ts`).
  Android 에서 (1) 나라 미상, 또는 (2) 기기 모델 미상이면서 Android 11. 6/12~10/5 에 199명이 걸렸고 그중 방에 들어간 사람은 0명이다.
  "기기 모델 미상"만으로는 한국 진짜 사용자 9명이 같이 빠져 Android 11 을 같이 건다. 미국의 기기 모델 미상(Android 16)과 Pixel 6 Pro 는
  로그인 0명이라 의심되지만 확실하지 않아 아직 두었다(9/8~9/21 19명). 첫 실행, 리텐션, 퍼널은 수집 때 GA4 필터로 빼고, 뺀 첫 실행은 `first_open_test` 로 남긴다.
  앱에서 막는 방법(Test Lab 이면 수집 끄기)은 `first_open` 이 앱 코드보다 먼저 찍혀 수집을 기본으로 꺼야 하고,
  그때 진짜 첫 실행이 남는지 문서로 확인되지 않아 하지 않았다
- **원본과 남는 작은 차이.** 사이트 방문은 기간 합(430)과 날마다 더한 값(431)이 1 다르다. 자정을 넘긴 방문이 이틀에 걸려 두 번 세지는 GA4 특성이다. AdMob 수익과 인스타 조회수는 콘솔이 지난 값을 나중에 조금 고친다. 인스타는 그래서 최근 7일을 매번 다시 받는다.

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

매주 월요일 한국 오전 9시 37분(`weekly-report.yml` → `/api/metrics/weekly`), 지난주 월~일을 그 전주와 비교해 디스코드로 한 번 보낸다.
수집은 하지 않고 위 테이블을 읽는다(`lib/metrics/weekly/`). 인스타 리포트와 같은 웹후크를 쓰고 봇 이름만 "주간 리포트"로 바꾼다.
같은 주는 `metrics_notifications`(kind `weekly_report`, key 주 시작일)로 한 번만 보낸다.

**더해도 되는 숫자만 쓴다.** 하루 도달, 하루 사용자는 같은 사람을 여러 날 세서 일주일로 더하면 부풀려진다.
그래서 인스타는 조회, 프로필 방문, 링크 클릭을, 앱은 이벤트 횟수(`first_open`, `game_start`)를, 웹은 세션과 다운로드 버튼 클릭 횟수를 더한다.
"앱 첫 실행 횟수"는 Android 와 iOS 의 `first_open` 을 더한 값이다. 앱을 지웠다 다시 깔면 또 세므로 사람 수(명)로 쓰지 않는다.

**한 주는 한국 날짜 월~일이다.** 인스타 계정 지표는 미국 서부(PT) 날짜로 오는데,
PT 하루는 한국 그날 오후 4~5시부터 다음 날 같은 시각까지라 대부분 다음 날과 겹친다.
그래서 PT 날짜는 하루 뒤로 옮겨(`shiftPt`) 한국 주에 넣는다. 옮기지 않으면 월요일 아침에는
PT 일요일 숫자가 아직 없어 한 주가 6일로 잘리고, 7일인 전주와 비교하게 된다.

**App Store 판매는 옮기지 않는다(#154).** 처음엔 PT 날짜로 보고 같이 옮겼는데, 서대페와 청춘대로(9/19) 다운로드가 9/20 에 찍혔다.
리포트 날짜를 GA4 iOS 첫 실행(한국 시간)과 견주면 그대로 둘 때 상관 0.92, 하루 뒤로 옮기면 0.14 였다.
7/4 서울게임타운도 리포트 15건, 첫 실행 15명으로 같은 날에 맞는다. 리포트가 PT 날짜였다면 한국 낮 행사(PT 전날 밤)는 전날 리포트에 잡혔어야 한다.
그래서 일요일 치는 월요일 새벽 수집 때 아직 없을 수 있다. 주간 리포트는 보내기 직전에 판매 리포트를 한 번 더 받고,
그래도 일요일 줄이 없으면 두 주 모두 월~토로 세고 그렇게 밝힌다. 받은 날에는 판매가 없어도 표시 줄이 남아서(`withMarker`) "아직 안 나옴"과 "0건"을 가른다.

인스타에서 온 방문은 세션 소스가 `ig`(인스타가 프로필 링크에 스스로 붙이는 UTM), instagram 이 들어간 값(우리 링크트리 UTM, 인스타 앱 안 브라우저), `linktr.ee` 인 세션이다(`fromInstagram()`). 링크트리는 인스타 프로필에만 걸려 있다.
처음엔 `ig` 를 빠뜨려 링크트리로 바꾸기 전(9월 초까지) 프로필 링크로 들어온 방문 68회를 못 셌다. `facebook.com` 은 인스타 앱 안 브라우저일 수도 있지만 페이스북 글과 가를 수 없어 넣지 않는다.
다운로드 버튼 클릭도 같은 기준으로 인스타에서 온 것만 따로 센다(`download_source`).

비교는 전주 값을 괄호에 그대로 적는다. 작은 숫자에서 "2배"나 "%" 로 바꾸면 과장되기 때문이다.

## 어드민 지표 화면 (#145)

`/admin/metrics`. 데이터는 `/api/admin/metrics?days=7|28|91` 이 어드민 토큰을 백엔드에 확인한 뒤(`lib/admin/server/checkAdmin.ts`, 만료면 401, 어드민이 아니면 403)
Supabase 에서 읽어 내려준다. 지표 테이블은 service role 로만 읽혀서 브라우저가 직접 읽지 않는다.

- 비교 기간은 `&cmp=` 로 바꾼다(#152). 없으면 바로 앞 같은 길이, `dow` 는 요일 맞춤, 날짜(`2026-09-01`)는 그날부터 같은 길이. 비교 기간은 지금 기간보다 앞이어야 하고 수집 시작(2026-04-01) 뒤여야 한다(`dashboard/calendar.ts compareError`). `off` 는 화면만 숨기고 서버는 이전 기간으로 계산한다
- 기간은 어제(한국 날짜)까지 7, 28, 91일(7일, 4주, 13주). 바로 앞 같은 길이와 비교한다. 이전 기간 날짜별 숫자(`previousDaily`)도 같이 내려 차트에 회색 선으로 겹친다
- 소스마다 숫자가 있는 첫날(`since`)과 마지막 날(`freshness`)을 같이 내린다. 그 밖의 날은 0 이 아니라 "숫자 없음"이라 화면이 선을 끊는다
- 합치는 규칙은 주간 리포트와 같다(`weekly/numbers.ts`). 날짜별 추이는 `dashboard/data.ts` 의 `dailySeries`
- 인스타 계정 지표(PT 날짜)는 주간 리포트처럼 하루 뒤 한국 날짜로 옮겨 그린다(`shiftPt`). App Store 판매는 그대로 그린다(#154)
- 단계(인스타 → 웹 → 다운로드 버튼 → 설치 → 첫 실행 → 게임)는 나란히 둘 뿐 비율로 잇지 않는다. 세는 대상과 하루의 기준이 달라서다
- 첫 실행 뒤는 같은 사람을 따라가는 신규 사용자 퍼널로 잇는다(#157, `components/admin/metrics/FunnelCard.tsx`). 아래 "신규 사용자 퍼널"
- 게시물을 올린 날을 모든 추이 차트에 점선으로 겹친다
- CSV 는 날짜별 숫자를 브라우저에서 바로 만든다(엑셀용 BOM 포함)

### 신규 사용자 퍼널 (#157)

이 기간에 앱을 처음 연 사람이 7일 안에 어디까지 갔는지 본다. 요약 탭, "모든 경로를 합친 흐름" 바로 아래.

| 단계 | GA4 이벤트(그중 하나라도) | 뜻 |
| --- | --- | --- |
| 앱 첫 실행 | `first_open` | 앱을 처음 연 사람 |
| 로그인 | `login` | 구글이나 애플로 로그인한 사람 |
| 방 입장 | `game_create`, `game_join` | 방을 만들거나 코드, 링크로 들어간 사람 |
| 게임 플레이 | `game_start`, `game_over` | 게임을 시작했거나 끝까지 한 사람. `game_start` 가 이벤트 게임에서 빠져(cops-and-robbers-FE#627) 끝 기록으로도 센다 |
| 다음 주에도 플레이 | `game_start`, `game_over` | 8~14일째에 다시 게임한 사람. 둘째 주까지 지난 날만, 분모는 그날들의 게임 플레이 |

- 7일이 다 지난 날만 넣는다. 화면은 "몇 일~몇 일에 처음 연 사람"과 아직 안 지나 뺀 날을 늘 적는다
- 막대는 첫 실행 대비, 오른쪽 %는 앞 단계 대비. 앞 단계 대비가 가장 낮은 단계는 % 를 노란색으로 짚는다(앞 단계 30명 미만이면 짚지 않는다). 원인을 짐작하는 해석 문단은 판단에 도움이 적어 넣지 않았다
- 플랫폼(전체, iOS, Android)과 나라를 고른다. 나라는 여러 개를 체크해 합쳐 본다(처음엔 모든 나라). 빠른 선택은 모든 나라, 한국만, 모두 빼기. 국가 미상은 목록 맨 아래. 나라별 표는 나라 버튼과 겹치고 줄 대부분이 테스트 기기 나라라 두지 않았다
- 활성화율(핵심 비율, 남는 사람)은 이 퍼널(모든 나라)의 첫 실행 대비 게임 플레이다. 첫 실행, 리텐션과 같이 테스트 기기만 뺀 기준이다
- 닉네임 단계는 넣지 않는다. 추천 닉네임을 그대로 쓰면 기록이 없다. 온보딩 완료(홈 화면 도착)는 로그인 수와 같아(이탈 0) 단계로 둘 이유가 없다
- `login` 이벤트가 2026-06-17 부터라 그 전에 처음 연 사람은 넣지 않는다(`FUNNEL_FROM`)
- 매일 처음 연 날 기준 최근 21일을 다시 묻는다(하루 질문 5개, 15일치 15초 남짓). 다시 채우기는 `?from=all` 로 2분 남짓

**Supabase 는 한 번에 1,000줄까지만 준다.** `.limit()` 를 크게 줘도 1,000줄에서 조용히 잘린다.
지표를 읽는 곳은 모두 `db.ts` 의 `selectAll` 로 쪽을 넘겨 읽는다(게시물 날짜별 숫자 포함). GA4 는 2주만 읽어도 1,000줄 가까이 된다.
`selectAll` 은 실패하면 0.8초 뒤 한 번 더 묻는다. Supabase 가 서버 사이 시계 차이로 "JWT issued at future" 를 가끔 한 번 낸다.

### 어드민 지표 화면이 더 읽는 것 (#145)

| 무엇 | 어디서 | 메모 |
| --- | --- | --- |
| 채널별 방문, 스토어로 간 방문 | `ga4_daily` session_campaign, download_source | `channels.ts channelOf` 로 인스타그램, 검색, 직접 입력과 QR, AI 서비스, 다른 SNS, 다른 사이트로 묶는다 |
| App Store 나라별 최초 다운로드 | `appstore_sales_daily` country | |
| 인스타 팔로워 수 | `instagram_followers` (0004) | 하루 증감 지표는 팔로워 100명 미만이면 인스타가 안 줘서, 수집 때마다 지금 수를 찍고 차이로 증감을 센다 |
| 일정(행사, 업데이트) | `metrics_events` (0004) | 어드민 화면에서 넣고 지운다(`/api/admin/metrics/events`). 모든 차트에 마름모로 겹친다 |
| iOS 출시 일정 | App Store 판매 리포트 Version 칸 | 수집 때 새 버전이 처음 내려받아진 날을 "iOS x.y.z 출시"로 자동으로 넣는다(`appstore/releases.ts`). 더 높은 버전보다 늦게 잡힌 버전은 뺀다 |
| 실제 판 수, 판당 인원 | 백엔드 `adminGameHistories` | 화면을 여는 어드민의 토큰으로 최신순 100개씩 읽다가 이전 기간 첫날보다 앞서면 멈춘다(최대 4,000판) |

0004 마이그레이션(`supabase/migrations/0004_followers_and_events.sql`)을 실행하기 전에는 팔로워와 일정 칸만 비어 있고 나머지는 그대로 보인다.

## 아직 남은 것

- Android 출시 일정은 아직 자동이 아니다. GA4 앱 버전은 시험 빌드가 섞이고(iOS TestFlight 3.1.22, 3.1.23 같은), Play 의 출시 기록은 Play Console 권한이 열려야 읽힌다(#147). 열리면 매일 프로덕션 트랙의 버전을 보고 바뀐 날을 넣는다

- App Store 분석 리포트 첫 파일이 나오면 실제 열을 보고 화면에서 쓸 축을 정한다
- 전체 기록(ONE_TIME_SNAPSHOT) 파일을 받으면 일회용 관리자 키(analytics-setup)를 폐기한다
- Play 설치 통계(#147)는 권한 반영을 기다린다
