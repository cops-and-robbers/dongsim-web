# 지표 챗봇 (#163)

어드민 지표 화면의 "물어보기" 탭. 팀원이 지표를 말로 물으면 숫자를 찾아 답한다.
코드는 `lib/metrics/chat/`, 라우트는 `app/api/admin/metrics/chat/route.ts`, 화면은 `components/admin/metrics/AskPanel.tsx`.

## 구조와 이유

숫자를 지어내지 않는 것이 이 기능의 전부다. 그래서 모델에게 맡기는 일을 줄였다.

| 단계 | 누가 | 왜 |
| --- | --- | --- |
| "지난주" 같은 말을 날짜로 | 서버(`periods.ts`) | 모델이 날짜를 세다 틀린다 |
| 데이터 읽기 | 도구 6개(`tools.ts`)만. SQL 은 쓰지 않는다 | 정해 둔 집계(지표 화면과 같은 `loadDashboard`)만 읽으면 화면과 숫자가 같다. 못 하는 질문은 못 한다고 실패한다 |
| 차이, 증감률, 행사 전후 | 도구가 계산해서 준다 | 모델의 산수는 자신 있게 틀린다 |
| 답 | 모델. 사실(인용 필수), 가설, 주의점, 후속 질문으로 나눠서 | 확인한 것과 추측을 화면에서 다르게 보여 준다 |
| 검증 | 코드(`verify.ts`) | 사실의 숫자가 인용한 도구 결과에 있는지, 사실에 원인 단정("때문에", "덕분에")이 없는지 본다 |
| 걸리면 | 걸린 곳을 알려 주고 한 번만 다시 쓰게. 그래도 걸리면 "숫자를 확인하지 못했어요" 표시 | 숨기지 않는다 |

조사 근거(2026-10-09): 지표 정의를 고정한 도구 방식이 SQL 생성보다 정확하고, 틀릴 때 "못 한다"고 실패했다(dbt 실험). LLM 은 상관에서 인과를 거의 찍듯이 고른다(Corr2Cause). 계산을 코드로 넘기면 정확도가 오른다(Program of Thoughts).

게임 서버 숫자(가입, 판 수, 참가 인원)는 요청한 어드민의 토큰으로 읽고, 날짜별 합계만 모델에 준다. 닉네임과 사용자 id 는 모델에 가지 않는다.
관리자만 참가한 판은 시험 판으로 보고 뺀다. 참가자 기록이 있는 2026-08-17 이후만 가릴 수 있다(`server.ts`).

## 처음 켜기

결제와 권한은 계정 일이라 사람이 한다.

1. Google Developer Program > My Benefits 에서 Google AI Pro 의 월 10달러 Cloud 크레딧을 결제 계정에 적용
2. 그 결제 계정에 연결된 GCP 프로젝트를 만든다(예: `dongsim-chat`). 챗봇 전용으로 두면 Spend Cap 이 다른 것을 건드리지 않는다
3. 그 프로젝트에서 Vertex AI API(`aiplatform.googleapis.com`)를 켠다
4. IAM 에서 지표 수집 서비스 계정(`GOOGLE_SERVICE_ACCOUNT_JSON` 의 `client_email`)에 "Vertex AI 사용자"(`roles/aiplatform.user`) 역할을 준다. 새 키를 만들지 않는다
5. 결제 > 예산 및 알림 > 예산 만들기 > 예산 유형 "Spend Cap": 그 프로젝트, 서비스 Gemini Enterprise Agent Platform, 월 8달러. 넘으면 몇 분 안에 새 요청이 막히고 다음 달 1일에 풀린다(미리보기 기능)
6. Vercel 환경변수 `CHAT_VERTEX_PROJECT` = 프로젝트 id (Production)
7. Supabase SQL Editor 에서 `supabase/migrations/0006_metrics_chat.sql` 실행

## 환경변수

| 이름 | 기본 | 뜻 |
| --- | --- | --- |
| `CHAT_VERTEX_PROJECT` | 없음 | 없으면 챗봇이 꺼져 "아직 연결 전이에요"가 보인다 |
| `CHAT_VERTEX_LOCATION` | `global` | Gemini 3 계열은 global 에서 시작한다 |
| `CHAT_MODEL` | `gemini-3.8-flash` | 생각은 low, 온도는 기본값(Gemini 3 권장) |
| `CHAT_GOOGLE_SERVICE_ACCOUNT_JSON` | 없음 | 비우면 `GOOGLE_SERVICE_ACCOUNT_JSON` 을 쓴다 |
| `CHAT_DAILY_LIMIT` | 30 | 사람당 하루 질문 수 |
| `CHAT_MONTHLY_USD` | 8 | 이번 달 추정 비용 합이 넘으면 막는다 |
| `CHAT_MOCK` | 없음 | `1` 이면 개발 서버에서만 가짜 모델(`devMock.ts`). 진짜 도구와 데이터로 화면과 검증 흐름을 본다. 질문에 "틀리게"를 넣으면 검증 실패 표시도 볼 수 있다 |

비용 상한은 두 겹이다. 프로젝트 Spend Cap 과 코드의 하루 질문 수, 월 비용 합. Spend Cap 이 미리보기라 바뀔 수 있어서 코드에서도 막는다.

## 비용

질문 하나는 보통 모델 2~4단계다. 2026-10-09 Gemini API 가격표로 3.8 Flash 보통 질문 약 0.026달러(추정)라 월 8달러면 약 300개.
실제 토큰은 `metrics_chat_log` 에 쌓이니 한 달 뒤 실측으로 이 문단을 고친다. 3.6~3.8 Flash 는 2027-01-01 에 가격이 두 배가 된다.

## 시험과 평가

- `pnpm test`: 검증기(`verify.test.mjs`), 도구와 기간 풀이, 시험 판 가리기, 추천 질문(`server.test.mjs`), 가짜 모델로 돌린 흐름(`run.test.mjs`: 한 번에 통과, 지어낸 숫자 다시 쓰기, 끝내 틀리면 표시, 원인 단정을 가설로, 도구 없이 숫자)
- 2026-10-09 가짜 모델로 실제 데이터에 돌려 확인: 9월 App Store 최초 다운로드 80, Play 최초 설치 88, 서대페(9/19~20) 대 앞 주 같은 요일 App Store 44 대 1(표본 적음 표시)
- 이 시험으로 잡은 결함: 다시 쓰기 요청에 도구 결과가 빠졌다(`first.response.messages` 는 마지막 단계만 담는다). 고쳤고 시험을 더했다
- 연결 뒤 할 것: 골든 질문(단일 조회, 기간 비교, 행사, 원인 유도, 범위 밖, 아직 없는 데이터, 적은 표본)을 실제 모델로 돌려 숫자 일치, 거절, 원인 단정, 질문당 비용을 잰다. "아니에요" 피드백이 달린 질문을 골든 질문에 더한다

## 알려진 한계

- 검증은 숫자가 도구 결과 어딘가에 있는지만 본다. 결과 속 날짜의 "4"(10월 4일) 같은 작은 숫자와 우연히 같으면 통과할 수 있다
- 질문은 하나씩 따로 보낸다. 앞 질문을 기억하지 않아서, 이어 묻기는 기간이 들어간 후속 질문 칩으로 한다
- App Store 판매(한국 날짜와 맞음, #154 실측)와 App Store 분석(UTC)은 하루 경계가 달라 일 단위로 견주면 어긋날 수 있다
