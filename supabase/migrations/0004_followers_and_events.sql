-- 인스타 팔로워 수 기록과 지표 화면 일정 표시 (#145).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.

-- 인스타 팔로워 수. 하루 단위 팔로워 증감 지표(follower_count)는 팔로워가 100명을 넘어야
-- 인스타가 준다(2026-10-06 기준 79명이라 빈 값). 그래서 매일 수집 때 지금 팔로워 수를 찍어 두고
-- 날마다의 차이로 증감을 센다. 날짜는 찍은 날(한국 날짜)이다.
create table if not exists instagram_followers (
  captured_on date primary key,
  followers   integer not null,
  follows     integer,                      -- 우리 계정이 팔로우하는 수(참고용)
  captured_at timestamptz not null default now()
);

-- 지표 차트에 겹쳐 그릴 일정(행사, 앱 업데이트, 광고 집행 등). 어드민 지표 화면에서 넣고 지운다.
-- "그날 왜 튀었나"를 숫자 옆에서 바로 설명하려고 둔다.
create table if not exists metrics_events (
  id         bigint generated always as identity primary key,
  day        date not null,
  label      text not null check (char_length(label) between 1 and 40),
  created_at timestamptz not null default now()
);
create index if not exists metrics_events_day on metrics_events (day);

grant all on instagram_followers, metrics_events to service_role;
grant usage, select on all sequences in schema public to service_role;

alter table instagram_followers enable row level security;
alter table metrics_events enable row level security;
