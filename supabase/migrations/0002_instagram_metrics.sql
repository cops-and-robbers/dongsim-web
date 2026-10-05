-- 인스타 성과 수집 스키마 (#140).
--
-- 인스타 API 는 게시물 숫자를 "지금까지 누적"으로만 준다. 하루 단위 변화는
-- 매일 찍어 둔 누적값의 차이로만 알 수 있어서, 찍지 않은 날은 나중에 되살릴 수
-- 없다. 그래서 수집(/api/metrics/instagram)이 매일 한 번 여기에 쌓는다.
--
-- 전부 서버(service role)만 읽고 쓴다. 토큰이 들어 있는 테이블도 있으므로
-- anon, authenticated 에는 아무 권한도 주지 않고 RLS 정책도 만들지 않는다.

-- 게시물. 캡션은 리포트에 한 줄만 쓰므로 앞부분만 둔다.
create table if not exists instagram_media (
  id            text primary key,           -- 인스타 미디어 ID
  permalink     text not null,
  caption       text,
  media_type    text not null,              -- IMAGE / VIDEO / CAROUSEL_ALBUM
  product_type  text not null,              -- FEED / REELS
  posted_at     timestamptz not null,
  first_seen_at timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists instagram_media_posted_at_idx
  on instagram_media (posted_at desc);

-- 게시물의 하루 한 번 누적값. 같은 날 다시 돌면 덮어쓴다 (captured_on 은 한국 날짜).
-- 릴스는 프로필 방문, 팔로우, 링크 클릭을 인스타가 주지 않아 비어 있고,
-- 피드는 시청 지표가 비어 있다.
create table if not exists instagram_media_daily (
  media_id           text not null references instagram_media (id) on delete cascade,
  captured_on        date not null,
  captured_at        timestamptz not null,
  views              integer,
  reach              integer,
  likes              integer,
  comments           integer,
  saved              integer,
  shares             integer,
  total_interactions integer,
  profile_visits     integer,
  follows            integer,
  bio_link_clicks    integer,
  avg_watch_ms       integer,
  total_watch_ms     bigint,
  skip_rate          numeric(5, 2),
  primary key (media_id, captured_on)
);

-- 계정 전체 하루 지표. 인스타는 미국 서부 시간으로 하루를 나누므로 day 는 그
-- 기준 날짜이고, 실제 경계(한국 시간 안내에 쓴다)는 day_start, day_end 에 둔다.
-- 끝난 하루만 저장하고, 최근 며칠은 값이 늦게 확정돼 수집할 때마다 다시 받아 덮어쓴다.
create table if not exists instagram_account_daily (
  day                date primary key,
  day_start          timestamptz not null,
  day_end            timestamptz not null,
  reach              integer,
  views              integer,
  profile_views      integer,
  website_clicks     integer,
  accounts_engaged   integer,
  total_interactions integer,
  updated_at         timestamptz not null default now()
);

-- 외부 서비스 토큰. 인스타 토큰은 60일이면 만료돼 수집이 주기적으로 연장하고,
-- 연장한 값을 여기 둔다 (환경변수는 수집기가 고쳐 쓸 수 없다).
-- seed_hash 는 처음 넣은 환경변수 토큰의 해시 - 사람이 토큰을 새로 발급해
-- 환경변수를 바꾸면 해시가 달라져 그쪽을 다시 받아들인다.
create table if not exists metrics_tokens (
  provider     text primary key,
  access_token text not null,
  expires_at   timestamptz,
  refreshed_at timestamptz not null default now(),
  seed_hash    text not null
);

-- 보낸 알림. 같은 리포트가 두 번 가지 않게 보내기 전에 먼저 자리를 잡는다.
-- kind 는 post_report / reach_spike, key 는 미디어 ID 나 날짜.
create table if not exists metrics_notifications (
  kind    text not null,
  key     text not null,
  sent_at timestamptz not null default now(),
  primary key (kind, key)
);

-- 프로젝트가 "새 테이블 자동 노출"을 끄고 만들어져서 권한을 명시로 준다 (0001 과 같은 이유).
grant all on instagram_media, instagram_media_daily, instagram_account_daily,
  metrics_tokens, metrics_notifications to service_role;

-- 정책 없이 RLS 만 켜 두면 service role 외에는 아무것도 못 읽는다.
alter table instagram_media enable row level security;
alter table instagram_media_daily enable row level security;
alter table instagram_account_daily enable row level security;
alter table metrics_tokens enable row level security;
alter table metrics_notifications enable row level security;
