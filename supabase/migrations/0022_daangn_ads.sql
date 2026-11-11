-- 당근 키워드 광고 하루 성과 수집.
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 소재 하나의 하루가 한 줄이다. 캠페인과 그룹은 소재 줄을 더해서 본다.
-- 이름은 그날 받은 값을 남긴다. 나중에 소재 이름을 바꿔도 그때 무엇이었는지 보인다.
-- 클릭률, 클릭당 비용은 평균을 내면 틀려서 저장하지 않고 그때그때 계산한다.
-- 도달은 날짜끼리 더할 수 없어 받지 않는다. day 는 한국 날짜다.
create table if not exists daangn_ads_daily (
  day           date not null,
  material_id   text not null,
  campaign_id   text not null,
  group_id      text not null,
  material_name text not null default '',
  impressions   integer not null default 0,
  clicks        integer not null default 0,
  cost_won      double precision not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (day, material_id)
);

create index if not exists daangn_ads_daily_day on daangn_ads_daily (day);

grant all on daangn_ads_daily to service_role;
alter table daangn_ads_daily enable row level security;
