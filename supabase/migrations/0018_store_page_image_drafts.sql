-- 어드민 스토어 페이지 이미지와 영상 초안.
-- Supabase 대시보드 SQL Editor 에서 한 번 실행한다. 다시 실행해도 안전하다.
--
-- 스토어, 언어, 칸(iPhone 스크린샷, 피처 그래픽 등)마다 앞으로 나갈 목록을 순서대로 한 줄에 둔다.
-- 파일은 팀 R2 의 store/ 에 있다. 스토어와 같아진 칸의 줄은 지운다.

create table if not exists store_page_image_drafts (
  platform   text not null check (platform in ('ios', 'android')),
  lang       text not null check (lang in ('ko', 'en', 'ja')),
  slot       text not null,
  items      jsonb not null,
  updated_by text not null,
  updated_at timestamptz not null default now(),
  primary key (platform, lang, slot)
);

grant all on store_page_image_drafts to service_role;
alter table store_page_image_drafts enable row level security;
