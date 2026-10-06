-- App Store, GA4, AdMob 수집 스키마 (#142, #143).
--
-- 0002 와 같은 원칙이다. 수집(/api/metrics/appstore, ga4, admob)이 매일 쌓고,
-- 화면과 주간 리포트는 이 테이블만 읽는다. 소스마다 하루의 기준 시간대가 달라
-- 합치지 않고 소스별로 둔다 - 판매 리포트는 미국 서부, 분석 리포트는 UTC,
-- GA4 는 속성 시간대, AdMob 은 계정 시간대(Asia/Seoul).
--
-- 전부 서버(service role)만 읽고 쓴다. anon, authenticated 에는 권한을 주지 않는다.

-- App Store 판매 리포트(Sales and Trends, 하루 요약). 애플은 하루 리포트를 1년만
-- 보관한다. 여기 받아 두면 그 뒤에도 남는다.
-- product_type 은 애플 코드 그대로: 1, 1F, 1T 신규 / 3, 3F 재다운로드 / 7, 7F, 7T 업데이트
create table if not exists appstore_sales_daily (
  day          date not null,               -- 미국 서부 기준
  country      text not null,
  product_type text not null,
  device       text not null,               -- iPhone, iPad, Desktop ...
  units        integer not null,
  updated_at   timestamptz not null default now(),
  primary key (day, country, product_type, device)
);

-- App Store 분석 리포트(Analytics Reports API) 한 줄. 리포트마다 열이 달라서
-- 숫자(Counts, Unique Counts) 외의 열은 dims 에 그대로 둔다.
-- 같은 날짜가 여러 파일에 나오면 가장 최근에 처리된 파일만 남긴다(processing_date).
create table if not exists appstore_analytics_daily (
  report          text not null,            -- engagement / downloads
  day             date not null,            -- UTC 기준
  dims_key        text not null,            -- dims 를 정렬해 이은 문자열 (기본 키용)
  dims            jsonb not null,
  counts          bigint,
  unique_counts   bigint,
  processing_date date not null,
  primary key (report, day, dims_key)
);

-- 받아 둔 분석 리포트 파일(인스턴스). 파일은 35일 뒤 애플에서 지워진다.
-- 한 번 처리한 인스턴스는 다시 받지 않는다.
create table if not exists appstore_analytics_instances (
  instance_id     text primary key,
  report          text not null,
  granularity     text not null,
  processing_date date not null,
  rows            integer not null,
  processed_at    timestamptz not null default now()
);

-- GA4 하루 지표. 질문마다 나눠 보는 축이 달라 세로로 길게 둔다.
--   breakdown: total, platform, event, session_campaign, first_user_campaign
--   key:       나눠 본 값 (total 이면 빈 문자열, 캠페인이면 "출처/매체/캠페인/버튼")
--   metric:    GA4 지표 이름 (activeUsers, sessions, eventCount ...)
create table if not exists ga4_daily (
  property   text not null,                 -- web / app
  day        date not null,                 -- 속성 시간대 기준
  breakdown  text not null,
  key        text not null,
  metric     text not null,
  value      double precision not null,
  updated_at timestamptz not null default now(),
  primary key (property, day, breakdown, key, metric)
);

-- AdMob 하루 지표 (계정 시간대 Asia/Seoul, 통화 USD).
-- 매치율, 노출률은 저장하지 않고 요청 수에서 계산한다(합칠 때 평균을 내면 틀린다).
create table if not exists admob_daily (
  day              date not null,
  platform         text not null,
  format           text not null,
  country          text not null,
  earnings_micros  bigint not null,         -- 예상 수익 x 1,000,000 (USD)
  ad_requests      bigint not null,
  matched_requests bigint not null,
  impressions      bigint not null,
  clicks           bigint not null,
  updated_at       timestamptz not null default now(),
  primary key (day, platform, format, country)
);

grant all on appstore_sales_daily, appstore_analytics_daily, appstore_analytics_instances,
  ga4_daily, admob_daily to service_role;

alter table appstore_sales_daily enable row level security;
alter table appstore_analytics_daily enable row level security;
alter table appstore_analytics_instances enable row level security;
alter table ga4_daily enable row level security;
alter table admob_daily enable row level security;
