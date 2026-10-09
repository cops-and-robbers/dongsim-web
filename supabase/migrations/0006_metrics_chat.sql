-- 어드민 지표 챗봇 기록 (#163).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 질문마다 한 줄. 세 가지에 쓴다.
--   1. 사람당 하루 질문 수 제한과 이번 달 비용 상한 (라우트가 보내기 전에 센다)
--   2. 평가: 걸린 답(unverified), 아니에요 피드백을 골든 질문 후보로
--   3. 비용 추정을 실측 토큰으로 바꾸기
-- user_key 는 어드민 사용자 id(토큰 sub). 닉네임 같은 개인정보는 넣지 않는다. 서버(service role)만 읽고 쓴다.
create table if not exists metrics_chat_log (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  user_key      text not null,
  question      text not null,
  answer        jsonb,
  tools         jsonb,
  unverified    text[] not null default '{}',
  retried       boolean not null default false,
  model         text not null,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  cached_tokens integer not null default 0,
  cost_usd      double precision not null default 0,
  error         text,
  feedback      text check (feedback in ('good', 'bad'))
);

create index if not exists metrics_chat_log_user_day on metrics_chat_log (user_key, created_at);

grant all on metrics_chat_log to service_role;
grant usage, select on sequence metrics_chat_log_id_seq to service_role;
alter table metrics_chat_log enable row level security;
