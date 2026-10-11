-- 어드민 지표 챗봇 사용 기록 넓히기 (#163).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다. 0006_metrics_chat.sql 다음에 실행한다.
--
-- 어드민마다 어떻게 묻고 한 달에 몇 번 쓰는지를 보려고 더한다. 이걸 보고 추천 질문, 자동 완성, 한도를 고친다.
-- 실행 전에도 챗봇은 돈다(라우트가 새 칸이 없으면 예전 칸만 넣는다).
--
-- source        질문을 어떻게 넣었나: typed(직접), suggestion(추천 질문), autocomplete(자동 완성), followup(이어 묻기)
-- view          질문할 때 보던 지표 화면의 탭과 기간
-- latency_ms    질문부터 답까지 걸린 시간
-- steps         모델이 도구를 부른 단계 수
-- tool_names    부른 도구(어떤 종류의 질문인지 가늠한다)
-- reasoning_tokens  출력 토큰 중 생각 몫(output_tokens 에 이미 들어 있다. 비용을 두 번 세지 않는다)
-- feedback      치즈 표정 평가: good(좋았어요), meh(애매해요), bad(아쉬워요). 0006 은 good, bad 만 받아서 제약을 바꾼다
-- feedback_reason, feedback_note, feedback_at  애매해요, 아쉬워요를 누른 이유와 한 줄 메모, 평가한 때
alter table metrics_chat_log add column if not exists source text check (source in ('typed', 'suggestion', 'autocomplete', 'followup'));
alter table metrics_chat_log add column if not exists view jsonb;
alter table metrics_chat_log add column if not exists latency_ms integer;
alter table metrics_chat_log add column if not exists steps integer;
alter table metrics_chat_log add column if not exists tool_names text[] not null default '{}';
alter table metrics_chat_log add column if not exists reasoning_tokens integer not null default 0;
alter table metrics_chat_log add column if not exists feedback_reason text check (feedback_reason in ('wrong_number', 'misunderstood', 'wrong_period', 'not_useful', 'other'));
alter table metrics_chat_log add column if not exists feedback_note text;
alter table metrics_chat_log add column if not exists feedback_at timestamptz;
alter table metrics_chat_log drop constraint if exists metrics_chat_log_feedback_check;
alter table metrics_chat_log add constraint metrics_chat_log_feedback_check check (feedback in ('good', 'meh', 'bad'));

create index if not exists metrics_chat_log_created on metrics_chat_log (created_at);

-- 어드민별 달마다 사용 요약. 표를 직접 읽지 않고 이걸 본다.
-- security_invoker: 읽는 사람 권한으로 돈다(표의 RLS 를 지킨다). 서버(service role)만 읽는다
create or replace view metrics_chat_monthly with (security_invoker = true) as
select
  user_key,
  to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM') as month,
  count(*) as questions,
  count(*) filter (where error is not null) as errors,
  count(*) filter (where source = 'typed') as typed,
  count(*) filter (where source = 'suggestion') as from_suggestion,
  count(*) filter (where source = 'autocomplete') as from_autocomplete,
  count(*) filter (where source = 'followup') as from_followup,
  count(*) filter (where feedback = 'good') as good,
  count(*) filter (where feedback = 'meh') as meh,
  count(*) filter (where feedback = 'bad') as bad,
  round(sum(cost_usd)::numeric, 4) as cost_usd,
  round(avg(latency_ms)) as avg_latency_ms,
  count(*) filter (where cardinality(unverified) > 0) as with_unverified
from metrics_chat_log
group by 1, 2;

revoke all on metrics_chat_monthly from anon, authenticated;
grant select on metrics_chat_monthly to service_role;
