-- 어드민 변경 기록 (#313, docs/admin-ui.md "변경 기록").
-- 어드민에서 값을 바꿀 때마다 한 줄. 누가, 언제, 어느 화면의 무엇을, 무엇에서 무엇으로.
-- 행사 저장본(event_settings_history), 출시 조작(release_actions), 회사 소개(company_audit)는 이미 따로 남아서 여기 다시 쓰지 않고 화면이 같이 읽는다.
-- 서버(service role)만 쓴다. 기록을 못 남겨도 저장은 막지 않는다(lib/changes/server.ts).

create table if not exists admin_changes (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  actor   text not null,
  area    text not null check (area in ('app-config', 'webgame', 'event', 'schedule', 'assets', 'store-page', 'reviews', 'team', 'release', 'company')),
  target  text not null check (char_length(target) between 1 and 120),
  action  text not null check (action in ('add', 'edit', 'remove', 'run')),
  fields  jsonb not null default '[]'::jsonb,   -- lib/changes/model.ts FieldChange[]
  href    text,
  impact  boolean not null default false        -- 사용자에게 바로 닿는 변경(점검, 최소 버전, 광고 끄기, 부스 닫기)
);
create index if not exists admin_changes_recent on admin_changes (at desc);

grant all on admin_changes to service_role;
grant usage, select on sequence admin_changes_id_seq to service_role;
alter table admin_changes enable row level security;
