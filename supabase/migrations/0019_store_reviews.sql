-- 어드민 리뷰 받은편지함.
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- Google Play API 는 최근 7일치 리뷰만 주므로 읽은 리뷰를 쌓아 둔다.
-- rating ~ reply_state 는 스토어에서 온 값이고, 나머지는 어드민에서 쓴 값이다. 수집은 앞쪽만 덮어쓴다.

create table if not exists store_reviews (
  platform    text not null check (platform in ('ios', 'android')),
  review_id   text not null,
  rating      int not null,
  title       text not null default '',
  body        text not null default '',
  translated  text,
  author      text not null default '',
  place       text,
  app_version text,
  device      text,
  reviewed_at timestamptz not null,
  reply       text,
  reply_at    timestamptz,
  reply_state text,
  reply_by    text,
  skipped_by  text,
  skipped_at  timestamptz,
  draft       text,
  draft_by    text,
  primary key (platform, review_id)
);

grant all on store_reviews to service_role;
alter table store_reviews enable row level security;
