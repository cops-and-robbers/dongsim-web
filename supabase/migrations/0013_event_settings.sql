-- 행사 설정 (#219).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 행사 값(이름, 날짜 문구, 장소, 부스 운영 시간, 홈 팝업, 행사 페이지)이 코드와 Vercel 환경 변수에 흩어져
-- 행사마다 고치고 다시 배포했다. 지표 일정의 행사 하나에 설정 한 줄을 매달고, 포토부스와 홈이 서버에서 읽는다.
-- 값의 모양과 검사는 코드(lib/event/settings.ts)가 정한다. 여기는 통째로 jsonb 로 둔다.
-- 읽지 못하면 화면은 마지막으로 코드에 있던 값으로 돈다(행사 중 저장소가 멈춰도 부스가 선다).

create table if not exists event_settings (
  event_id   bigint primary key references metrics_events(id) on delete cascade,
  settings   jsonb not null,
  version    integer not null default 1,            -- 둘이 동시에 고칠 때 나중 사람이 앞사람 것을 덮지 않게
  updated_by text not null,
  updated_at timestamptz not null default now()
);

-- 저장할 때마다 한 줄. 어드민이 예전 저장본으로 되돌릴 때 쓴다
create table if not exists event_settings_history (
  id         bigint generated always as identity primary key,
  event_id   bigint not null references metrics_events(id) on delete cascade,
  version    integer not null,
  settings   jsonb not null,
  updated_by text not null,
  updated_at timestamptz not null default now()
);
create index if not exists event_settings_history_event on event_settings_history (event_id, version desc);

-- 행사에 매이지 않는 사이트 설정. 지금은 홈 미니게임 칸을 보이는 기간 하나(key = 'home_minigame')
create table if not exists site_settings (
  key        text primary key,
  value      jsonb,
  updated_by text not null,
  updated_at timestamptz not null default now()
);

grant all on event_settings, event_settings_history, site_settings to service_role;
grant usage, select on sequence event_settings_history_id_seq to service_role;
alter table event_settings enable row level security;
alter table event_settings_history enable row level security;
alter table site_settings enable row level security;
