-- 어드민 리뷰의 상황별 답변 문구.
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 마케터가 세 언어로 써 두면 답글 칸에서 골라 시작한다. 쓰지 않은 언어는 빈 문자열이다.

create table if not exists review_reply_templates (
  id         bigint generated always as identity primary key,
  title      text not null,
  fit        text not null default 'any' check (fit in ('low', 'high', 'any')),
  body_ko    text not null default '',
  body_en    text not null default '',
  body_ja    text not null default '',
  updated_by text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

grant all on review_reply_templates to service_role;
grant usage, select on sequence review_reply_templates_id_seq to service_role;
alter table review_reply_templates enable row level security;
