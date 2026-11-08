-- 어드민 스토어 점검에서 사람이 끝냈다고 표시한 항목.
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- API 로 읽을 수 없는 일(판매자 신고, 약관 동의 등)만 여기 둔다. 되돌리면 줄을 지운다.

create table if not exists store_check_done (
  id      text primary key,
  done_by text not null,
  done_at timestamptz not null default now()
);

grant all on store_check_done to service_role;
alter table store_check_done enable row level security;
