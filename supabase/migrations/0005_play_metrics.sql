-- Google Play 리포트 수집 (#147).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- Play 는 설치 통계를 API 로 주지 않고, Cloud Storage 에 달마다 CSV 를 갱신한다(3~7일 늦게).
-- 리포트마다 칸이 달라 GA4 처럼 세로로 길게 둔다.
--   report: installs, store(스토어 등록정보), crashes, ratings
--   dim:    overview, country, app_version, traffic_source
--   key:    나눠 본 값. overview 는 빈 문자열, 나라 코드, 버전 코드,
--           유입 경로는 "경로|검색어|UTM 소스|UTM 캠페인"
--   metric: user_installs, install_events, user_uninstalls, uninstall_events, device_installs,
--           device_upgrades, active_devices, visitors, acquisitions, crashes, anrs, rating_daily, rating_total
--
-- day 는 파일 그대로 미국 서부(PT) 날짜다. 화면과 리포트는 인스타처럼 하루 뒤로 옮겨 한국 날짜에 맞춘다
-- (docs/metrics-collection.md "Google Play"). 서버(service role)만 읽고 쓴다.
create table if not exists play_daily (
  report     text not null,
  dim        text not null,
  key        text not null default '',
  day        date not null,
  metric     text not null,
  value      double precision not null,
  updated_at timestamptz not null default now(),
  primary key (report, dim, key, day, metric)
);

create index if not exists play_daily_day on play_daily (day);

grant all on play_daily to service_role;
alter table play_daily enable row level security;
