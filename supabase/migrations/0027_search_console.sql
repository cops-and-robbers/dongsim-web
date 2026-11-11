-- 검색 색인 현황 (#309).
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 구글 서치 콘솔 API 는 "오늘 상태"만 준다. 매일 저장해야 지난 상태와 비교하고 추세를 그린다.
-- day 는 한국 날짜다. 검색 실적(gsc_search_daily)만 구글이 주는 미국 서부 날짜를 그대로 쓴다.

-- 주소 하나의 그날 구글 판정 (URL 검사 API)
create table if not exists gsc_inspection_daily (
  day              date not null,
  url              text not null,
  verdict          text not null default '',
  coverage_state   text not null default '',
  indexing_state   text not null default '',
  page_fetch_state text not null default '',
  robots_txt_state text not null default '',
  last_crawl_time  timestamptz,
  google_canonical text,
  user_canonical   text,
  in_sitemap       boolean not null default false,
  crawled_as       text,
  link             text,
  updated_at       timestamptz not null default now(),
  primary key (day, url)
);
create index if not exists gsc_inspection_daily_day on gsc_inspection_daily (day);

-- 검색 실적. breakdown 은 total, page, query, country, device 중 하나, total 의 key 는 ''.
-- 평균 게재순위는 더하면 틀려서 노출수로 가중해 다시 계산한다(position * impressions 를 더한 뒤 노출수로 나눔).
create table if not exists gsc_search_daily (
  day         date not null,
  breakdown   text not null,
  key         text not null,
  clicks      integer not null default 0,
  impressions integer not null default 0,
  position    double precision not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (day, breakdown, key)
);
create index if not exists gsc_search_daily_day on gsc_search_daily (day);

-- 사이트맵 상태
create table if not exists gsc_sitemap_daily (
  day             date not null,
  path            text not null,
  last_submitted  timestamptz,
  last_downloaded timestamptz,
  is_pending      boolean not null default false,
  errors          integer not null default 0,
  warnings        integer not null default 0,
  submitted       integer not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (day, path)
);

-- 주소 하나의 흐름. 처음 본 주소는 모두 남기고, 그 뒤 새로 생긴 주소만 30일 동안 따라간다.
-- origin: baseline(추적을 시작하기 전부터 있던 주소), blog, meetup, page
create table if not exists search_tracking (
  url              text primary key,
  origin           text not null,
  first_seen_at    timestamptz not null default now(),
  tracked          boolean not null default false,
  notified_at      timestamptz,
  first_crawled_at timestamptz,
  indexed_at       timestamptz,
  last_kind        text,
  last_checked_on  date,
  requested_at     timestamptz,
  requested_by     text,
  updated_at       timestamptz not null default now()
);

-- 우리가 밖에 보낸 것. 사이트맵 제출, IndexNow, 서치 콘솔에서 요청했다는 기록
create table if not exists search_actions (
  id         bigint generated always as identity primary key,
  action     text not null,
  urls       text[] not null default '{}',
  status     text not null,
  message    text,
  actor      text not null,
  created_at timestamptz not null default now()
);
create index if not exists search_actions_created on search_actions (created_at desc);

-- 블로그 동기화 한 번의 결과. 버튼이든 크론이든 남긴다
create table if not exists blog_sync_runs (
  id          bigint generated always as identity primary key,
  ok          boolean not null,
  published   text[] not null default '{}',
  updated     text[] not null default '{}',
  unpublished text[] not null default '{}',
  removed     text[] not null default '{}',
  failed      integer not null default 0,
  created_at  timestamptz not null default now()
);

grant all on gsc_inspection_daily, gsc_search_daily, gsc_sitemap_daily, search_tracking, search_actions, blog_sync_runs to service_role;
alter table gsc_inspection_daily enable row level security;
alter table gsc_search_daily enable row level security;
alter table gsc_sitemap_daily enable row level security;
alter table search_tracking enable row level security;
alter table search_actions enable row level security;
alter table blog_sync_runs enable row level security;
