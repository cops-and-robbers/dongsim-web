-- 챗봇 밖에서 쓴 Vertex 비용 (#163).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다. 0010 다음에 실행한다.
--
-- 평가 실험(scripts/chat-eval/vertex.mjs)도 같은 구글 지출 한도(₩12,000)에서 빠진다. 그런데 질문 기록(metrics_chat_log)에만
-- 비용이 있으면 "이번 달 약 N번 더"가 실험 비용을 모르고 크게 나온다(2026-10-11: 실험 $4.12 를 빼지 못해 598번으로 보였다).
-- 실험을 질문 기록에 섞으면 어드민별, 버전별 성적이 부풀어서 표를 따로 둔다. 남은 한도는 두 표의 합으로 센다.
--
-- kind     eval(평가 실험). 나중에 다른 쓰임이 생기면 더한다
-- label    무엇을 돌렸나(결과 폴더, 문항 묶음)
-- answers  그 실험에서 받은 답 수
create table if not exists metrics_chat_spend (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('eval')),
  label       text not null,
  answers     integer not null default 0,
  cost_usd    double precision not null default 0,
  version     text,
  model       text
);

create index if not exists metrics_chat_spend_created on metrics_chat_spend (created_at);

-- 서버(service role)만 읽고 쓴다
alter table metrics_chat_spend enable row level security;
revoke all on metrics_chat_spend from anon, authenticated;
