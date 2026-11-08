-- 어드민 출시 조작 기록 (#231).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 어드민에서 스토어에 보낸 조작(버전 칸 이름, 빌드 붙이기, 심사 제출, 출시, 단계적 출시)을 한 줄씩 남긴다.
-- 누르기 전에 started 로 넣고 끝나면 done 또는 failed 로 바꾼다. 이 표가 없으면 어드민은 조작 버튼을 켜지 않는다
-- (기록 없이 스토어를 바꾸지 않는다). 같은 조작이 몇 분 안에 두 번 들어오는 것도 이 표로 막는다.

create table if not exists release_actions (
  id          bigint generated always as identity primary key,
  platform    text not null check (platform in ('ios', 'android')),
  action      text not null,                -- ios.submit, android.createRelease ...
  version     text not null,                -- 그때 버전(또는 빌드 번호)
  expect      text not null,                -- 누를 때 스토어 상태. 같은 상태에서 두 번 누르는 것을 막는다
  params      jsonb not null default '{}',
  status      text not null default 'started' check (status in ('started', 'done', 'failed')),
  message     text,                         -- 결과 또는 스토어가 돌려준 실패 사유
  actor       text not null,
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists release_actions_recent on release_actions (created_at desc);

grant all on release_actions to service_role;
grant usage, select on sequence release_actions_id_seq to service_role;
alter table release_actions enable row level security;
