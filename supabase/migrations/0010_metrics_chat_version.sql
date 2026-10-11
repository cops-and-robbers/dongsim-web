-- 체다 버전 기록 (#163).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다. 0009 다음에 실행한다.
--
-- 질문마다 그때의 체다 버전(lib/metrics/chat/version.ts)을 남긴다. 질문, 답, 만족도 평가가 버전에 묶여
-- 버전끼리 견줄 수 있다. 실행 전에도 챗봇은 돈다(라우트가 새 칸이 없으면 빼고 넣는다).
alter table metrics_chat_log add column if not exists version text;

-- 버전별 성적. 다음 버전을 낼지, 낸 버전이 나아졌는지 이걸로 본다.
-- 평가 칸 이름은 그림(치즈 신선도)을 따른다: fresh 만족해요, ripe 보통이에요, moldy 아쉬워요.
-- fresh_rate: 평가한 답 중 만족해요 비율. 평가가 적으면(rated 가 작으면) 흔들리니 같이 본다
create or replace view metrics_chat_versions with (security_invoker = true) as
select
  coalesce(version, '1.0') as version,
  model,
  count(*) as questions,
  count(distinct user_key) as admins,
  count(*) filter (where error is not null) as errors,
  count(feedback) as rated,
  count(*) filter (where feedback = 'good') as fresh,
  count(*) filter (where feedback = 'meh') as ripe,
  count(*) filter (where feedback = 'bad') as moldy,
  round(100.0 * count(*) filter (where feedback = 'good') / nullif(count(feedback), 0), 1) as fresh_rate,
  count(*) filter (where cardinality(unverified) > 0) as with_unverified,
  round(avg(latency_ms)) as avg_latency_ms,
  round(sum(cost_usd)::numeric, 4) as cost_usd,
  round((sum(cost_usd) / nullif(count(*) filter (where error is null), 0))::numeric, 4) as cost_per_answer,
  min(created_at) as first_at,
  max(created_at) as last_at
from metrics_chat_log
group by 1, 2;

revoke all on metrics_chat_versions from anon, authenticated;
grant select on metrics_chat_versions to service_role;
